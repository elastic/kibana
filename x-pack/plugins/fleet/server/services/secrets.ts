/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkResponse, DeleteResponse } from '@elastic/elasticsearch/lib/api/types';

import { keyBy } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

import { packageHasNoPolicyTemplates } from '../../common/services/policy_template';

import type {
  NewPackagePolicy,
  PackagePolicyConfigRecordEntry,
  RegistryStream,
} from '../../common';

import {
  doesPackageHaveIntegrations,
  getNormalizedDataStreams,
  getNormalizedInputs,
} from '../../common/services';

import type {
  PackageInfo,
  PackagePolicy,
  RegistryVarsEntry,
  Secret,
  VarSecretReference,
  PolicySecretReference,
} from '../types';

import { FleetError } from '../errors';
import { SECRETS_INDEX } from '../constants';

import { appContextService } from './app_context';

interface SecretPath {
  path: string;
  value: PackagePolicyConfigRecordEntry;
}

// TODO: QUESTION do we need audit logging in this service?
export async function createSecrets(opts: {
  esClient: ElasticsearchClient;
  values: string[];
}): Promise<Secret[]> {
  const { esClient, values } = opts;
  const logger = appContextService.getLogger();
  const body = values.flatMap((value) => [
    {
      create: { _index: SECRETS_INDEX },
    },
    { value },
  ]);
  let res: BulkResponse;
  try {
    res = await esClient.bulk({
      index: SECRETS_INDEX,
      body,
    });

    const itemsWithErrors = res.items.filter(({ create }) => create?.error);
    if (itemsWithErrors.length) {
      throw new Error(JSON.stringify(itemsWithErrors));
    }

    return res.items.map((item, i) => ({
      id: item.create!._id as string,
      value: values[i],
    }));
  } catch (e) {
    const msg = `Error creating secrets in ${SECRETS_INDEX} index: ${e}`;
    logger.error(msg);
    throw new FleetError(msg);
  }
}

export async function deleteSecret(opts: {
  esClient: ElasticsearchClient;
  id: string;
}): Promise<DeleteResponse['result']> {
  const { esClient, id } = opts;
  let res: DeleteResponse;
  try {
    res = await esClient.delete({
      index: SECRETS_INDEX,
      id,
    });
  } catch (e) {
    const logger = appContextService.getLogger();
    const msg = `Error deleting secret '${id}' from ${SECRETS_INDEX} index: ${e}`;
    logger.error(msg);
    throw new FleetError(msg);
  }

  return res.result;
}

export async function extractAndWriteSecrets(opts: {
  packagePolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  esClient: ElasticsearchClient;
}): Promise<{ packagePolicy: NewPackagePolicy; secret_references: PolicySecretReference[] }> {
  const { packagePolicy, packageInfo, esClient } = opts;
  const secretPaths = extractSecretVarsFromPackagePolicy(packagePolicy, packageInfo);

  if (!secretPaths.length) {
    return { packagePolicy, secret_references: [] };
  }

  const secrets = await createSecrets({
    esClient,
    values: secretPaths.map((secretPath) => secretPath.value.value),
  });

  const policyWithSecretRefs = JSON.parse(JSON.stringify(packagePolicy));

  secretPaths.forEach((secretPath, i) => {
    set(policyWithSecretRefs, secretPath.path, makeVarSecretRef(secrets[i].id));
  });

  return { packagePolicy, secret_references: secrets.map(({ id }) => ({ id })) };
}

function makeVarSecretRef(id: string): VarSecretReference {
  return { id, isSecretRef: true };
}

function isVarSecret(varDef: RegistryVarsEntry) {
  return varDef.secret;
}

function hasSecretVar(vars?: RegistryVarsEntry[]) {
  return vars?.some(isVarSecret);
}

export function extractSecretVarsFromPackagePolicy(
  packagePolicy: PackagePolicy | NewPackagePolicy,
  packageInfo: PackageInfo
): SecretPath[] {
  const packageLevelVarPaths = _extractPackageLevelSecretPaths(packagePolicy, packageInfo);

  if (!packageInfo?.policy_templates?.length || packageHasNoPolicyTemplates(packageInfo)) {
    return packageLevelVarPaths;
  }

  const inputSecretPaths = _extractInputSecretPaths(packagePolicy, packageInfo);

  return [...packageLevelVarPaths, ...inputSecretPaths];
}

function _extractPackageLevelSecretPaths(
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo
): SecretPath[] {
  const packageSecretVars = packageInfo.vars?.filter(isVarSecret) || [];
  const packageSecretVarsByName = keyBy(packageSecretVars, 'name');
  const packageVars = Object.entries(packagePolicy.vars || {});

  return packageVars.reduce((vars, [name, configEntry], i) => {
    if (packageSecretVarsByName[name]) {
      vars.push({
        value: configEntry,
        path: `vars.${name}`,
      });
    }
    return vars;
  }, [] as SecretPath[]);
}

function _extractInputSecretPaths(
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo
): SecretPath[] {
  if (!packageInfo?.policy_templates?.length) return [];

  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  const inputSecretVarDefsByPolicyTemplateAndType = packageInfo.policy_templates.reduce<
    Record<string, Record<string, RegistryVarsEntry>>
  >((varDefs, policyTemplate) => {
    const inputs = getNormalizedInputs(policyTemplate);
    inputs.forEach((input) => {
      const varDefKey = hasIntegrations ? `${policyTemplate.name}-${input.type}` : input.type;
      const secretVars = input?.vars?.filter(isVarSecret);
      if (secretVars?.length) {
        varDefs[varDefKey] = keyBy(secretVars, 'name');
      }
    });
    return varDefs;
  }, {});

  const dataStreams = getNormalizedDataStreams(packageInfo);
  const streamsByDatasetAndInput = dataStreams.reduce<Record<string, RegistryStream>>(
    (streams, dataStream) => {
      dataStream.streams?.forEach((stream) => {
        streams[`${dataStream.dataset}-${stream.input}`] = stream;
      });
      return streams;
    },
    {}
  );
  const streamSecretVarDefsByDatasetAndInput = Object.entries(streamsByDatasetAndInput).reduce<
    Record<string, Record<string, RegistryVarsEntry>>
  >((varDefs, [path, stream]) => {
    if (stream.vars && hasSecretVar(stream.vars)) {
      const secretVars = stream.vars.filter(isVarSecret);
      varDefs[path] = keyBy(secretVars, 'name');
    }
    return varDefs;
  }, {});

  return packagePolicy.inputs.flatMap((input, inputIndex) => {
    if (!input.vars && !input.streams) {
      return [];
    }
    const currentInputVarPaths: SecretPath[] = [];
    const inputKey = hasIntegrations ? `${input.policy_template}-${input.type}` : input.type;
    const inputVars = Object.entries(input.vars || {});
    if (inputVars.length) {
      inputVars.forEach(([name, configEntry]) => {
        if (inputSecretVarDefsByPolicyTemplateAndType[inputKey]?.[name]) {
          currentInputVarPaths.push({
            path: `inputs.${inputIndex}.vars.${name}`,
            value: configEntry,
          });
        }
      });
    }

    if (input.streams.length) {
      input.streams.forEach((stream, streamIndex) => {
        const streamVarDefs =
          streamSecretVarDefsByDatasetAndInput[`${stream.data_stream.dataset}-${input.type}`];
        if (streamVarDefs && Object.keys(streamVarDefs).length) {
          Object.entries(stream.vars || {}).forEach(([name, configEntry]) => {
            if (streamVarDefs[name]) {
              currentInputVarPaths.push({
                path: `inputs.${inputIndex}.streams.${streamIndex}.vars.${name}`,
                value: configEntry,
              });
            }
          });
        }
      });
    }

    return currentInputVarPaths;
  });
}
