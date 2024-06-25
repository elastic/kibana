/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SecurityClusterPrivilege,
  SecurityCreateApiKeyResponse,
  SecurityIndexPrivilege,
} from '@elastic/elasticsearch/lib/api/types';
import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';

import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { SyntheticsServerSetup } from '../types';
import { syntheticsServiceAPIKeySavedObject } from '../saved_objects/service_api_key';
import { SyntheticsServiceApiKey } from '../../common/runtime_types/synthetics_service_api_key';
import { checkHasPrivileges } from './authentication/check_has_privilege';

export const syntheticsIndex = 'synthetics-*';

export const getServiceApiKeyPrivileges = (isServerlessEs: boolean) => {
  const cluster: SecurityClusterPrivilege[] = ['monitor', 'read_pipeline'];
  if (isServerlessEs === false) cluster.push('read_ilm');
  return {
    cluster,
    indices: [
      {
        names: [syntheticsIndex],
        privileges: [
          'view_index_metadata',
          'create_doc',
          'auto_configure',
          'read',
        ] as SecurityIndexPrivilege[],
      },
    ],
    run_as: [],
  };
};

export const getAPIKeyForSyntheticsService = async ({
  server,
}: {
  server: SyntheticsServerSetup;
}): Promise<{ apiKey?: SyntheticsServiceApiKey; isValid: boolean }> => {
  try {
    const apiKey = await syntheticsServiceAPIKeySavedObject.get(server);

    if (apiKey) {
      const [isValid, { index }] = await Promise.all([
        server.security.authc.apiKeys.validate({
          id: apiKey.id,
          api_key: apiKey.apiKey,
        }),
        checkHasPrivileges(server, apiKey),
      ]);

      const indexPermissions = index[syntheticsIndex];

      const hasPermissions =
        indexPermissions.auto_configure &&
        indexPermissions.create_doc &&
        indexPermissions.view_index_metadata &&
        indexPermissions.read;

      if (!hasPermissions) {
        return { isValid: false, apiKey };
      }

      if (!isValid) {
        server.logger.info('Synthetics api is no longer valid');
      }

      return { apiKey, isValid };
    }
  } catch (err) {
    server.logger.error(err);
  }

  return { isValid: false };
};

export const generateAPIKey = async ({
  server,
  request,
}: {
  server: SyntheticsServerSetup;
  request: KibanaRequest;
}) => {
  const { isElasticsearchServerless, security } = server;
  const isApiKeysEnabled = await security.authc.apiKeys?.areAPIKeysEnabled();

  if (!isApiKeysEnabled) {
    throw new Error('Please enable API keys in kibana to use synthetics service.');
  }

  const { canEnable } = await hasEnablePermissions(server);
  if (!canEnable) {
    throw new SyntheticsForbiddenError();
  }

  /* Not exposed to the user. May grant as internal user */
  return security.authc.apiKeys?.grantAsInternalUser(request, {
    name: 'synthetics-api-key (required for Synthetics App)',
    role_descriptors: {
      synthetics_writer: getServiceApiKeyPrivileges(isElasticsearchServerless),
    },
    metadata: {
      description:
        'Created for synthetics service to be passed to the heartbeat to communicate with ES',
    },
  });
};

export const generateProjectAPIKey = async ({
  server,
  request,
  accessToElasticManagedLocations = true,
}: {
  server: SyntheticsServerSetup;
  request: KibanaRequest;
  accessToElasticManagedLocations?: boolean;
}): Promise<SecurityCreateApiKeyResponse | null> => {
  const { security } = server;
  const isApiKeysEnabled = await security.authc.apiKeys?.areAPIKeysEnabled();

  if (!isApiKeysEnabled) {
    throw new Error('Please enable API keys in kibana to use synthetics service.');
  }

  /* Exposed to the user. Must create directly with the user */
  return security.authc.apiKeys?.create(request, {
    name: 'synthetics-api-key (required for project monitors)',
    kibana_role_descriptors: {
      uptime_save: {
        elasticsearch: {},
        kibana: [
          {
            base: [],
            spaces: [ALL_SPACES_ID],
            feature: {
              uptime: [accessToElasticManagedLocations ? 'all' : 'minimal_all'],
            },
          },
        ],
      },
    },
    metadata: {
      description:
        'Created for the Synthetics Agent to be able to communicate with Kibana for generating monitors for projects',
    },
  });
};

export const generateAndSaveServiceAPIKey = async ({
  server,
  request,
  authSavedObjectsClient,
}: {
  server: SyntheticsServerSetup;
  request: KibanaRequest;
  // authSavedObject is needed for write operations
  authSavedObjectsClient?: SavedObjectsClientContract;
}) => {
  const apiKeyResult = await generateAPIKey({ server, request });

  if (apiKeyResult) {
    const { id, name, api_key: apiKey } = apiKeyResult;
    const apiKeyObject = { id, name, apiKey };
    if (authSavedObjectsClient) {
      // discard decoded key and rest of the keys
      await syntheticsServiceAPIKeySavedObject.set(authSavedObjectsClient, apiKeyObject);
    }
    return apiKeyObject;
  }
};

export const getSyntheticsEnablement = async ({ server }: { server: SyntheticsServerSetup }) => {
  const { security, config } = server;

  const [apiKey, hasPrivileges, areApiKeysEnabled] = await Promise.all([
    getAPIKeyForSyntheticsService({ server }),
    hasEnablePermissions(server),
    security.authc.apiKeys.areAPIKeysEnabled(),
  ]);

  const { canEnable, canManageApiKeys } = hasPrivileges;

  if (!config.service?.manifestUrl && !config.service?.devUrl) {
    return {
      canEnable: true,
      canManageApiKeys,
      isEnabled: true,
      isValidApiKey: true,
      areApiKeysEnabled: true,
    };
  }

  return {
    canEnable,
    canManageApiKeys,
    isEnabled: Boolean(apiKey?.apiKey),
    isValidApiKey: apiKey?.isValid,
    areApiKeysEnabled,
  };
};

const hasEnablePermissions = async ({
  uptimeEsClient,
  isElasticsearchServerless,
}: SyntheticsServerSetup) => {
  const { cluster: clusterPrivs, indices: index } =
    getServiceApiKeyPrivileges(isElasticsearchServerless);
  const hasPrivileges = await uptimeEsClient.baseESClient.security.hasPrivileges({
    body: {
      cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key', ...clusterPrivs],
      index,
    },
  });

  const { cluster } = hasPrivileges;
  const {
    manage_security: manageSecurity,
    manage_api_key: manageApiKey,
    manage_own_api_key: manageOwnApiKey,
    monitor,
    // `read_ilm` is going to be `undefined` when ES is in serverless mode,
    // so we default it to the ES capabilities value.
    read_ilm: readILM = isElasticsearchServerless,
    read_pipeline: readPipeline,
  } = cluster || {};

  const canManageApiKeys = manageSecurity || manageApiKey || manageOwnApiKey;
  const hasClusterPermissions = readILM && readPipeline && monitor;
  const hasIndexPermissions = !Object.values(hasPrivileges.index?.['synthetics-*'] || []).includes(
    false
  );

  return {
    canManageApiKeys,
    canEnable: hasClusterPermissions && hasIndexPermissions,
  };
};

export class SyntheticsForbiddenError extends Error {
  constructor() {
    super();
    this.message = 'Forbidden';
    this.name = 'SyntheticsForbiddenError';
  }
}
