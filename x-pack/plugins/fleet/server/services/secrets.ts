/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkResponse, DeleteResponse } from '@elastic/elasticsearch/lib/api/types';

import { keyBy, partition } from 'lodash';
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

import { auditLoggingService } from './audit_logging';

import { appContextService } from './app_context';

interface SecretPath {
  path: string;
  value: PackagePolicyConfigRecordEntry;
}

// This will be removed once the secrets index PR is merged into elasticsearch
function getSecretsIndex() {
  const testIndex = appContextService.getConfig()?.developer?.testSecretsIndex;
  if (testIndex) {
    return testIndex;
  }
  return SECRETS_INDEX;
}

export async function createSecrets(opts: {
  esClient: ElasticsearchClient;
  values: string[];
}): Promise<Secret[]> {
  const { esClient, values } = opts;
  const logger = appContextService.getLogger();
  const body = values.flatMap((value) => [
    {
      create: { _index: getSecretsIndex() },
    },
    { value },
  ]);
  let res: BulkResponse;
  try {
    res = await esClient.bulk({
      body,
    });

    const [errorItems, successItems] = partition(res.items, (a) => a.create?.error);

    successItems.forEach((item) => {
      auditLoggingService.writeCustomAuditLog({
        message: `secret created: ${item.create!._id}`,
        event: {
          action: 'secret_create',
          category: ['database'],
          type: ['access'],
          outcome: 'success',
        },
      });
    });

    if (errorItems.length) {
      throw new Error(JSON.stringify(errorItems));
    }

    return res.items.map((item, i) => ({
      id: item.create!._id as string,
      value: values[i],
    }));
  } catch (e) {
    const msg = `Error creating secrets in ${getSecretsIndex()} index: ${e}`;
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
      index: getSecretsIndex(),
      id,
    });

    auditLoggingService.writeCustomAuditLog({
      message: `secret deleted: ${id}`,
      event: {
        action: 'secret_delete',
        category: ['database'],
        type: ['access'],
        outcome: 'success',
      },
    });
  } catch (e) {
    const logger = appContextService.getLogger();
    const msg = `Error deleting secret '${id}' from ${getSecretsIndex()} index: ${e}`;
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
  const secretPaths = getPolicySecretPaths(packagePolicy, packageInfo);

  if (!secretPaths.length) {
    return { packagePolicy, secret_references: [] };
  }

  const secrets = await createSecrets({
    esClient,
    values: secretPaths.map((secretPath) => secretPath.value.value),
  });

  const policyWithSecretRefs = JSON.parse(JSON.stringify(packagePolicy));
  secretPaths.forEach((secretPath, i) => {
    set(policyWithSecretRefs, secretPath.path + '.value', toVarSecretRef(secrets[i].id));
  });

  return {
    packagePolicy: policyWithSecretRefs,
    secret_references: secrets.map(({ id }) => ({ id })),
  };
}

function isSecretVar(varDef: RegistryVarsEntry) {
  return varDef.secret === true;
}

function containsSecretVar(vars?: RegistryVarsEntry[]) {
  return vars?.some(isSecretVar);
}

// this is how secrets are stored on the package policy
function toVarSecretRef(id: string): VarSecretReference {
  return { id, isSecretRef: true };
}

// this is how IDs are inserted into compiled templates
export function toCompiledSecretRef(id: string) {
  return `$co.elastic.secret{${id}}`;
}

// Given a package policy and a package,
// returns an array of lodash style paths to all secrets and their current values
export function getPolicySecretPaths(
  packagePolicy: PackagePolicy | NewPackagePolicy,
  packageInfo: PackageInfo
): SecretPath[] {
  const packageLevelVarPaths = _getPackageLevelSecretPaths(packagePolicy, packageInfo);

  if (!packageInfo?.policy_templates?.length || packageHasNoPolicyTemplates(packageInfo)) {
    return packageLevelVarPaths;
  }

  const inputSecretPaths = _getInputSecretPaths(packagePolicy, packageInfo);

  return [...packageLevelVarPaths, ...inputSecretPaths];
}

function _getPackageLevelSecretPaths(
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo
): SecretPath[] {
  const packageSecretVars = packageInfo.vars?.filter(isSecretVar) || [];
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

function _getInputSecretPaths(
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo
): SecretPath[] {
  if (!packageInfo?.policy_templates?.length) return [];

  const inputSecretVarDefsByPolicyTemplateAndType =
    _getInputSecretVarDefsByPolicyTemplateAndType(packageInfo);

  const streamSecretVarDefsByDatasetAndInput =
    _getStreamSecretVarDefsByDatasetAndInput(packageInfo);

  return packagePolicy.inputs.flatMap((input, inputIndex) => {
    if (!input.vars && !input.streams) {
      return [];
    }
    const currentInputVarPaths: SecretPath[] = [];
    const inputKey = doesPackageHaveIntegrations(packageInfo)
      ? `${input.policy_template}-${input.type}`
      : input.type;
    const inputVars = Object.entries(input.vars || {});
    if (inputVars.length) {
      inputVars.forEach(([name, configEntry]) => {
        if (inputSecretVarDefsByPolicyTemplateAndType[inputKey]?.[name]) {
          currentInputVarPaths.push({
            path: `inputs[${inputIndex}].vars.${name}`,
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
                path: `inputs[${inputIndex}].streams[${streamIndex}].vars.${name}`,
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

// a map of all secret vars for each dataset and input combo
function _getStreamSecretVarDefsByDatasetAndInput(packageInfo: PackageInfo) {
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

  return Object.entries(streamsByDatasetAndInput).reduce<
    Record<string, Record<string, RegistryVarsEntry>>
  >((varDefs, [path, stream]) => {
    if (stream.vars && containsSecretVar(stream.vars)) {
      const secretVars = stream.vars.filter(isSecretVar);
      varDefs[path] = keyBy(secretVars, 'name');
    }
    return varDefs;
  }, {});
}

// a map of all secret vars for each policyTemplate and input type combo
function _getInputSecretVarDefsByPolicyTemplateAndType(packageInfo: PackageInfo) {
  if (!packageInfo?.policy_templates?.length) return {};

  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  return packageInfo.policy_templates.reduce<Record<string, Record<string, RegistryVarsEntry>>>(
    (varDefs, policyTemplate) => {
      const inputs = getNormalizedInputs(policyTemplate);
      inputs.forEach((input) => {
        const varDefKey = hasIntegrations ? `${policyTemplate.name}-${input.type}` : input.type;
        const secretVars = input?.vars?.filter(isSecretVar);
        if (secretVars?.length) {
          varDefs[varDefKey] = keyBy(secretVars, 'name');
        }
      });
      return varDefs;
    },
    {}
  );
}
