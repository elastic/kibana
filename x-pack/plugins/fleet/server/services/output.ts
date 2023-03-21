/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { v5 as uuidv5 } from 'uuid';
import { omit } from 'lodash';
import { safeLoad } from 'js-yaml';

import type { NewOutput, Output, OutputSOAttributes } from '../types';
import {
  DEFAULT_OUTPUT,
  DEFAULT_OUTPUT_ID,
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
} from '../constants';
import { SO_SEARCH_LIMIT, outputType } from '../../common/constants';
import { decodeCloudId, normalizeHostsForAgents } from '../../common/services';
import {
  OutputUnauthorizedError,
  OutputInvalidError,
  FleetEncryptedSavedObjectEncryptionKeyRequired,
} from '../errors';

import { agentPolicyService } from './agent_policy';
import { appContextService } from './app_context';
import { escapeSearchQueryPhrase } from './saved_object';

type Nullable<T> = { [P in keyof T]: T[P] | null };

const SAVED_OBJECT_TYPE = OUTPUT_SAVED_OBJECT_TYPE;

const DEFAULT_ES_HOSTS = ['http://localhost:9200'];

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
} as unknown as KibanaRequest;

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
  return uuidv5(id, uuidv5.DNS);
}

function outputSavedObjectToOutput(so: SavedObject<OutputSOAttributes>): Output {
  const { output_id: outputId, ssl, proxy_id: proxyId, ...atributes } = so.attributes;

  return {
    id: outputId ?? so.id,
    ...atributes,
    ...(ssl ? { ssl: JSON.parse(ssl as string) } : {}),
    ...(proxyId ? { proxy_id: proxyId } : {}),
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
  private get encryptedSoClient() {
    return appContextService.getInternalUserSOClient(fakeRequest);
  }

  private async _getDefaultDataOutputsSO(soClient: SavedObjectsClientContract) {
    return await this.encryptedSoClient.find<OutputSOAttributes>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });
  }

  private async _getDefaultMonitoringOutputsSO(soClient: SavedObjectsClientContract) {
    return await this.encryptedSoClient.find<OutputSOAttributes>({
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
    const data: OutputSOAttributes = { ...omit(output, 'ssl') };

    if (output.type === outputType.Logstash) {
      await validateLogstashOutputNotUsedInAPMPolicy(soClient, undefined, data.is_default);
      if (!appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt) {
        throw new FleetEncryptedSavedObjectEncryptionKeyRequired(
          'Logstash output needs encrypted saved object api key to be set'
        );
      }
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

    if (output.ssl) {
      data.ssl = JSON.stringify(output.ssl);
    }

    // Remove the shipper data if the shipper is not enabled from the yaml config
    if (!output.config_yaml && output.shipper) {
      data.shipper = null;
    }
    if (output.config_yaml) {
      const configJs = safeLoad(output.config_yaml);
      const isShipperDisabled = !configJs?.shipper || configJs?.shipper?.enabled === false;

      if (isShipperDisabled && output.shipper) {
        data.shipper = null;
      }
    }

    const newSo = await this.encryptedSoClient.create<OutputSOAttributes>(SAVED_OBJECT_TYPE, data, {
      overwrite: options?.overwrite || options?.fromPreconfiguration,
      id: options?.id ? outputIdToUuid(options.id) : undefined,
    });

    return outputSavedObjectToOutput(newSo);
  }

  public async bulkGet(
    soClient: SavedObjectsClientContract,
    ids: string[],
    { ignoreNotFound = false } = { ignoreNotFound: true }
  ) {
    const res = await this.encryptedSoClient.bulkGet<OutputSOAttributes>(
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
    const outputs = await this.encryptedSoClient.find<OutputSOAttributes>({
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

  public async listAllForProxyId(soClient: SavedObjectsClientContract, proxyId: string) {
    const outputs = await this.encryptedSoClient.find<OutputSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      searchFields: ['proxy_id'],
      search: escapeSearchQueryPhrase(proxyId),
    });

    return {
      items: outputs.saved_objects.map<Output>(outputSavedObjectToOutput),
      total: outputs.total,
      page: outputs.page,
      perPage: outputs.per_page,
    };
  }

  public async get(soClient: SavedObjectsClientContract, id: string): Promise<Output> {
    const outputSO = await this.encryptedSoClient.get<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      outputIdToUuid(id)
    );

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

    return this.encryptedSoClient.delete(SAVED_OBJECT_TYPE, outputIdToUuid(id));
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

    const updateData: Nullable<Partial<OutputSOAttributes>> = { ...omit(data, 'ssl') };
    const mergedType = data.type ?? originalOutput.type;
    const mergedIsDefault = data.is_default ?? originalOutput.is_default;

    if (mergedType === outputType.Logstash) {
      await validateLogstashOutputNotUsedInAPMPolicy(soClient, id, mergedIsDefault);
    }

    // If the output type changed
    if (data.type && data.type !== originalOutput.type) {
      if (data.type === outputType.Logstash) {
        // remove ES specific field
        updateData.ca_trusted_fingerprint = null;
        updateData.ca_sha256 = null;
      } else {
        // remove logstash specific field
        updateData.ssl = null;
      }
    }

    if (data.ssl) {
      updateData.ssl = JSON.stringify(data.ssl);
    } else if (data.ssl === null) {
      // Explicitly set to null to allow to delete the field
      updateData.ssl = null;
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

    // Remove the shipper data if the shipper is not enabled from the yaml config
    if (!data.config_yaml && data.shipper) {
      updateData.shipper = null;
    }
    if (data.config_yaml) {
      const configJs = safeLoad(data.config_yaml);
      const isShipperDisabled = !configJs?.shipper || configJs?.shipper?.enabled === false;

      if (isShipperDisabled && data.shipper) {
        updateData.shipper = null;
      }
    }

    const outputSO = await this.encryptedSoClient.update<Nullable<OutputSOAttributes>>(
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
