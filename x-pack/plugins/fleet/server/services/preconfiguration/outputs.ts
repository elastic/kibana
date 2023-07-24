/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { isEqual } from 'lodash';
import { safeDump } from 'js-yaml';

import type { PreconfiguredOutput, Output, NewOutput } from '../../../common/types';
import { normalizeHostsForAgents } from '../../../common/services';
import type { FleetConfigType } from '../../config';
import { DEFAULT_OUTPUT_ID, DEFAULT_OUTPUT } from '../../constants';
import { outputService } from '../output';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';

import { isDifferent } from './utils';

export function getPreconfiguredOutputFromConfig(config?: FleetConfigType) {
  const { outputs: outputsOrUndefined } = config;

  const outputs: PreconfiguredOutput[] = (outputsOrUndefined || []).concat([
    ...(config?.agents.elasticsearch.hosts
      ? [
          {
            ...DEFAULT_OUTPUT,
            id: DEFAULT_OUTPUT_ID,
            hosts: config?.agents.elasticsearch.hosts,
            ca_sha256: config?.agents.elasticsearch.ca_sha256,
            is_preconfigured: true,
          } as PreconfiguredOutput,
        ]
      : []),
  ]);

  return outputs;
}

export async function ensurePreconfiguredOutputs(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  outputs: PreconfiguredOutput[]
) {
  await createOrUpdatePreconfiguredOutputs(soClient, esClient, outputs);
  await cleanPreconfiguredOutputs(soClient, esClient, outputs);
}

export async function createOrUpdatePreconfiguredOutputs(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  outputs: PreconfiguredOutput[]
) {
  const logger = appContextService.getLogger();

  if (outputs.length === 0) {
    return;
  }

  const existingOutputs = await outputService.bulkGet(
    soClient,
    outputs.map(({ id }) => id),
    { ignoreNotFound: true }
  );

  await Promise.all(
    outputs.map(async (output) => {
      const existingOutput = existingOutputs.find((o) => o.id === output.id);

      const { id, config, ...outputData } = output;

      const configYaml = config ? safeDump(config) : undefined;

      const data: NewOutput = {
        ...outputData,
        is_preconfigured: true,
        config_yaml: configYaml ?? null,
        // Set value to null to update these fields on update
        ca_sha256: outputData.ca_sha256 ?? null,
        ca_trusted_fingerprint: outputData.ca_trusted_fingerprint ?? null,
        ssl: outputData.ssl ?? null,
      };

      if (!data.hosts || data.hosts.length === 0) {
        data.hosts = outputService.getDefaultESHosts();
      }

      const isCreate = !existingOutput;

      // field in allow edit are not updated through preconfiguration
      if (!isCreate && output.allow_edit) {
        for (const key of output.allow_edit) {
          // @ts-expect-error
          data[key] = existingOutput[key];
        }
      }

      const isUpdateWithNewData =
        existingOutput && isPreconfiguredOutputDifferentFromCurrent(existingOutput, data);

      if (isCreate) {
        logger.debug(`Creating output ${output.id}`);
        await outputService.create(soClient, esClient, data, { id, fromPreconfiguration: true });
      } else if (isUpdateWithNewData) {
        logger.debug(`Updating output ${output.id}`);
        await outputService.update(soClient, esClient, id, data, { fromPreconfiguration: true });
        // Bump revision of all policies using that output
        if (outputData.is_default || outputData.is_default_monitoring) {
          await agentPolicyService.bumpAllAgentPolicies(soClient, esClient);
        } else {
          await agentPolicyService.bumpAllAgentPoliciesForOutput(soClient, esClient, id);
        }
      }
    })
  );
}

export async function cleanPreconfiguredOutputs(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  outputs: PreconfiguredOutput[]
) {
  const existingOutputs = await outputService.list(soClient);
  const existingPreconfiguredOutput = existingOutputs.items.filter(
    (o) => o.is_preconfigured === true
  );

  const logger = appContextService.getLogger();

  for (const output of existingPreconfiguredOutput) {
    const hasBeenDelete = !outputs.find(({ id }) => output.id === id);
    if (!hasBeenDelete) {
      continue;
    }

    if (output.is_default) {
      logger.info(`Updating default preconfigured output ${output.id} is no longer preconfigured`);
      await outputService.update(
        soClient,
        esClient,
        output.id,
        { is_preconfigured: false },
        {
          fromPreconfiguration: true,
        }
      );
    } else if (output.is_default_monitoring) {
      logger.info(`Updating default preconfigured output ${output.id} is no longer preconfigured`);
      await outputService.update(
        soClient,
        esClient,
        output.id,
        { is_preconfigured: false },
        {
          fromPreconfiguration: true,
        }
      );
    } else {
      logger.info(`Deleting preconfigured output ${output.id}`);
      await outputService.delete(soClient, output.id, { fromPreconfiguration: true });
    }
  }
}

function isPreconfiguredOutputDifferentFromCurrent(
  existingOutput: Output,
  preconfiguredOutput: Partial<Output>
): boolean {
  return (
    !existingOutput.is_preconfigured ||
    isDifferent(existingOutput.is_default, preconfiguredOutput.is_default) ||
    isDifferent(existingOutput.is_default_monitoring, preconfiguredOutput.is_default_monitoring) ||
    isDifferent(existingOutput.name, preconfiguredOutput.name) ||
    isDifferent(existingOutput.type, preconfiguredOutput.type) ||
    (preconfiguredOutput.hosts &&
      !isEqual(
        existingOutput?.type === 'elasticsearch'
          ? existingOutput.hosts?.map(normalizeHostsForAgents)
          : existingOutput.hosts,
        preconfiguredOutput.type === 'elasticsearch'
          ? preconfiguredOutput.hosts.map(normalizeHostsForAgents)
          : preconfiguredOutput.hosts
      )) ||
    isDifferent(preconfiguredOutput.ssl, existingOutput.ssl) ||
    isDifferent(existingOutput.ca_sha256, preconfiguredOutput.ca_sha256) ||
    isDifferent(
      existingOutput.ca_trusted_fingerprint,
      preconfiguredOutput.ca_trusted_fingerprint
    ) ||
    isDifferent(existingOutput.config_yaml, preconfiguredOutput.config_yaml) ||
    isDifferent(existingOutput.proxy_id, preconfiguredOutput.proxy_id) ||
    isDifferent(existingOutput.allow_edit ?? [], preconfiguredOutput.allow_edit ?? [])
  );
}
