/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { isEqual } from 'lodash';
import { safeDump } from 'js-yaml';

import type { PreconfiguredOutput, Output } from '../../../common';
import { normalizeHostsForAgents } from '../../../common';
import { outputService } from '../output';
import { agentPolicyService } from '../agent_policy';

import { appContextService } from '../app_context';

export async function ensurePreconfiguredOutputs(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  outputs: PreconfiguredOutput[]
) {
  await createOrUpdatePreconfiguredOutputs(soClient, esClient, outputs);
  await cleanPreconfiguredOutputs(soClient, outputs);
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

      const data = {
        ...outputData,
        config_yaml: configYaml,
        is_preconfigured: true,
      };

      if (!data.hosts || data.hosts.length === 0) {
        data.hosts = outputService.getDefaultESHosts();
      }

      const isCreate = !existingOutput;
      const isUpdateWithNewData =
        existingOutput && isPreconfiguredOutputDifferentFromCurrent(existingOutput, data);

      if (isCreate) {
        logger.debug(`Creating output ${output.id}`);
        await outputService.create(soClient, data, { id, fromPreconfiguration: true });
      } else if (isUpdateWithNewData) {
        logger.debug(`Updating output ${output.id}`);
        await outputService.update(soClient, id, data, { fromPreconfiguration: true });
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
    existingOutput.is_default !== preconfiguredOutput.is_default ||
    existingOutput.is_default_monitoring !== preconfiguredOutput.is_default_monitoring ||
    existingOutput.name !== preconfiguredOutput.name ||
    existingOutput.type !== preconfiguredOutput.type ||
    (preconfiguredOutput.hosts &&
      !isEqual(
        existingOutput.hosts?.map(normalizeHostsForAgents),
        preconfiguredOutput.hosts.map(normalizeHostsForAgents)
      )) ||
    (preconfiguredOutput.ssl && !isEqual(preconfiguredOutput.ssl, existingOutput.ssl)) ||
    existingOutput.ca_sha256 !== preconfiguredOutput.ca_sha256 ||
    existingOutput.ca_trusted_fingerprint !== preconfiguredOutput.ca_trusted_fingerprint ||
    existingOutput.config_yaml !== preconfiguredOutput.config_yaml
  );
}
