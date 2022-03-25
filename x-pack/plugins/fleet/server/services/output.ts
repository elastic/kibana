/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import uuid from 'uuid/v5';

import type { NewOutput, Output, OutputSOAttributes } from '../types';
import {
  DEFAULT_OUTPUT,
  DEFAULT_OUTPUT_ID,
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
} from '../constants';
import { decodeCloudId, normalizeHostsForAgents, SO_SEARCH_LIMIT, outputType } from '../../common';
import { OutputUnauthorizedError, OutputInvalidError } from '../errors';

import { agentPolicyService } from './agent_policy';
import { appContextService } from './app_context';

const SAVED_OBJECT_TYPE = OUTPUT_SAVED_OBJECT_TYPE;

const DEFAULT_ES_HOSTS = ['http://localhost:9200'];

// differentiate
function isUUID(val: string) {
  return (
    typeof val === 'string' &&
    val.match(/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/)
  );
}

export function outputIdToUuid(id: string) {
  if (isUUID(id)) {
    return id;
  }

  // UUID v5 need a namespace (uuid.DNS), changing this params will result in loosing the ability to generate predicable uuid
  return uuid(id, uuid.DNS);
}

function outputSavedObjectToOutput(so: SavedObject<OutputSOAttributes>) {
  const { output_id: outputId, ...atributes } = so.attributes;
  return {
    id: outputId ?? so.id,
    ...atributes,
  };
}

async function validateLogstashOutputNotUsedInAPMPolicy(
  soClient: SavedObjectsClientContract,
  outputId?: string,
  isDefault?: boolean
) {
  // Validate no policy with APM use that policy
  let kuery: string;
  if (outputId) {
    if (isDefault) {
      kuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:"${outputId}" or not ${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:*`;
    } else {
      kuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:"${outputId}"`;
    }
  } else {
    if (isDefault) {
      kuery = `not ${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:*`;
    } else {
      return;
    }
  }

  const agentPolicySO = await agentPolicyService.list(soClient, {
    kuery,
    perPage: SO_SEARCH_LIMIT,
    withPackagePolicies: true,
  });
  for (const agentPolicy of agentPolicySO.items) {
    if (agentPolicyService.hasAPMIntegration(agentPolicy)) {
      throw new OutputInvalidError('Logstash output cannot be used with APM integration.');
    }
  }
}

class OutputService {
  private async _getDefaultDataOutputsSO(soClient: SavedObjectsClientContract) {
    return await soClient.find<OutputSOAttributes>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });
  }

  private async _getDefaultMonitoringOutputsSO(soClient: SavedObjectsClientContract) {
    return await soClient.find<OutputSOAttributes>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      searchFields: ['is_default_monitoring'],
      search: 'true',
    });
  }

  public async ensureDefaultOutput(soClient: SavedObjectsClientContract) {
    const outputs = await this.list(soClient);

    const defaultOutput = outputs.items.find((o) => o.is_default);
    const defaultMonitoringOutput = outputs.items.find((o) => o.is_default_monitoring);

    if (!defaultOutput) {
      const newDefaultOutput = {
        ...DEFAULT_OUTPUT,
        hosts: this.getDefaultESHosts(),
        ca_sha256: appContextService.getConfig()!.agents.elasticsearch.ca_sha256,
        is_default_monitoring: !defaultMonitoringOutput,
      } as NewOutput;

      return await this.create(soClient, newDefaultOutput, {
        id: DEFAULT_OUTPUT_ID,
        overwrite: true,
      });
    }

    return defaultOutput;
  }

  public getDefaultESHosts(): string[] {
    const cloud = appContextService.getCloud();
    const cloudId = cloud?.isCloudEnabled && cloud.cloudId;
    const cloudUrl = cloudId && decodeCloudId(cloudId)?.elasticsearchUrl;
    const cloudHosts = cloudUrl ? [cloudUrl] : undefined;
    const flagHosts =
      appContextService.getConfig()!.agents?.elasticsearch?.hosts &&
      appContextService.getConfig()!.agents.elasticsearch.hosts?.length
        ? appContextService.getConfig()!.agents.elasticsearch.hosts
        : undefined;

    return cloudHosts || flagHosts || DEFAULT_ES_HOSTS;
  }

  public async getDefaultDataOutputId(soClient: SavedObjectsClientContract) {
    const outputs = await this._getDefaultDataOutputsSO(soClient);

    if (!outputs.saved_objects.length) {
      return null;
    }

    return outputSavedObjectToOutput(outputs.saved_objects[0]).id;
  }

  public async getDefaultMonitoringOutputId(soClient: SavedObjectsClientContract) {
    const outputs = await this._getDefaultMonitoringOutputsSO(soClient);

    if (!outputs.saved_objects.length) {
      return null;
    }

    return outputSavedObjectToOutput(outputs.saved_objects[0]).id;
  }

  public async create(
    soClient: SavedObjectsClientContract,
    output: NewOutput,
    options?: { id?: string; fromPreconfiguration?: boolean; overwrite?: boolean }
  ): Promise<Output> {
    const data: OutputSOAttributes = { ...output };

    if (output.type === outputType.Logstash) {
      await validateLogstashOutputNotUsedInAPMPolicy(soClient, undefined, data.is_default);
    }

    // ensure only default output exists
    if (data.is_default) {
      const defaultDataOuputId = await this.getDefaultDataOutputId(soClient);
      if (defaultDataOuputId) {
        await this.update(
          soClient,
          defaultDataOuputId,
          { is_default: false },
          { fromPreconfiguration: options?.fromPreconfiguration ?? false }
        );
      }
    }
    if (data.is_default_monitoring) {
      const defaultMonitoringOutputId = await this.getDefaultMonitoringOutputId(soClient);
      if (defaultMonitoringOutputId) {
        await this.update(
          soClient,
          defaultMonitoringOutputId,
          { is_default_monitoring: false },
          { fromPreconfiguration: options?.fromPreconfiguration ?? false }
        );
      }
    }

    if (data.type === outputType.Elasticsearch && data.hosts) {
      data.hosts = data.hosts.map(normalizeHostsForAgents);
    }

    if (options?.id) {
      data.output_id = options?.id;
    }

    const newSo = await soClient.create<OutputSOAttributes>(SAVED_OBJECT_TYPE, data, {
      overwrite: options?.overwrite || options?.fromPreconfiguration,
      id: options?.id ? outputIdToUuid(options.id) : undefined,
    });

    return {
      id: options?.id ?? newSo.id,
      ...newSo.attributes,
    };
  }

  public async bulkGet(
    soClient: SavedObjectsClientContract,
    ids: string[],
    { ignoreNotFound = false } = { ignoreNotFound: true }
  ) {
    const res = await soClient.bulkGet<OutputSOAttributes>(
      ids.map((id) => ({ id: outputIdToUuid(id), type: SAVED_OBJECT_TYPE }))
    );

    return res.saved_objects
      .map((so) => {
        if (so.error) {
          if (!ignoreNotFound || so.error.statusCode !== 404) {
            throw so.error;
          }
          return undefined;
        }

        return outputSavedObjectToOutput(so);
      })
      .filter((output): output is Output => typeof output !== 'undefined');
  }

  public async list(soClient: SavedObjectsClientContract) {
    const outputs = await soClient.find<OutputSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      sortField: 'is_default',
      sortOrder: 'desc',
    });

    return {
      items: outputs.saved_objects.map<Output>(outputSavedObjectToOutput),
      total: outputs.total,
      page: outputs.page,
      perPage: outputs.per_page,
    };
  }

  public async get(soClient: SavedObjectsClientContract, id: string): Promise<Output> {
    const outputSO = await soClient.get<OutputSOAttributes>(SAVED_OBJECT_TYPE, outputIdToUuid(id));

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }

    return outputSavedObjectToOutput(outputSO);
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    id: string,
    { fromPreconfiguration = false }: { fromPreconfiguration?: boolean } = {
      fromPreconfiguration: false,
    }
  ) {
    const originalOutput = await this.get(soClient, id);

    if (originalOutput.is_preconfigured && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(
        `Preconfigured output ${id} cannot be deleted outside of kibana config file.`
      );
    }

    if (originalOutput.is_default && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(`Default output ${id} cannot be deleted.`);
    }

    if (originalOutput.is_default_monitoring && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(`Default monitoring output ${id} cannot be deleted.`);
    }

    await agentPolicyService.removeOutputFromAll(
      soClient,
      appContextService.getInternalUserESClient(),
      id
    );

    return soClient.delete(SAVED_OBJECT_TYPE, outputIdToUuid(id));
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    data: Partial<Output>,
    { fromPreconfiguration = false }: { fromPreconfiguration: boolean } = {
      fromPreconfiguration: false,
    }
  ) {
    const originalOutput = await this.get(soClient, id);

    if (originalOutput.is_preconfigured && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(
        `Preconfigured output ${id} cannot be updated outside of kibana config file.`
      );
    }

    const updateData = { ...data };
    const mergedType = data.type ?? originalOutput.type;
    const mergedIsDefault = data.is_default ?? originalOutput.is_default;

    if (mergedType === outputType.Logstash) {
      await validateLogstashOutputNotUsedInAPMPolicy(soClient, id, mergedIsDefault);
    }

    // ensure only default output exists
    if (data.is_default) {
      const defaultDataOuputId = await this.getDefaultDataOutputId(soClient);
      if (defaultDataOuputId && defaultDataOuputId !== id) {
        await this.update(
          soClient,
          defaultDataOuputId,
          { is_default: false },
          { fromPreconfiguration }
        );
      }
    }
    if (data.is_default_monitoring) {
      const defaultMonitoringOutputId = await this.getDefaultMonitoringOutputId(soClient);

      if (defaultMonitoringOutputId && defaultMonitoringOutputId !== id) {
        await this.update(
          soClient,
          defaultMonitoringOutputId,
          { is_default_monitoring: false },
          { fromPreconfiguration }
        );
      }
    }

    if (mergedType === outputType.Elasticsearch && updateData.hosts) {
      updateData.hosts = updateData.hosts.map(normalizeHostsForAgents);
    }
    const outputSO = await soClient.update<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      outputIdToUuid(id),
      updateData
    );

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }
  }
}

export const outputService = new OutputService();
