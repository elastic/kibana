/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import assert from 'assert';
import type { ToolingLog } from '@kbn/tooling-log';
import { isServerlessKibanaFlavor } from '../../../common/endpoint/utils/kibana_status';
import { createEsClient } from './stack_services';
import type { CreatedSecuritySuperuser } from './security_user_services';
import { createSecuritySuperuser } from './security_user_services';

export interface DeleteAllEndpointDataResponse {
  count: number;
  query: string;
  response: estypes.DeleteByQueryResponse;
}

/**
 * Attempts to delete all data associated with the provided endpoint agent IDs.
 *
 * **NOTE:** This utility will create a new role and user that has elevated privileges and access to system indexes.
 *
 * @param esClient
 * @param log
 * @param endpointAgentIds
 * @param asSuperuser
 */
export const deleteAllEndpointData = async (
  esClient: Client,
  log: ToolingLog,
  endpointAgentIds: string[],
  /** If true, then a new user will be created that has full privileges to indexes (especially system indexes) */
  asSuperuser: boolean = true
): Promise<DeleteAllEndpointDataResponse> => {
  assert(endpointAgentIds.length > 0, 'At least one endpoint agent id must be defined');

  let esClientUnrestricted = esClient;

  if (asSuperuser) {
    log.debug(`Looking to use a superuser type of account`);

    const isServerless = await isServerlessKibanaFlavor(esClient);
    let unrestrictedUser: CreatedSecuritySuperuser | undefined;

    if (isServerless) {
      log.debug(`In serverless mode. Creating new ES Client using 'system_indices_superuser'`);

      unrestrictedUser = {
        password: 'changeme',
        username: 'system_indices_superuser',
        created: false,
      };
    } else {
      log.debug(`Creating new superuser account [super_superuser]`);
      unrestrictedUser = await createSecuritySuperuser(esClient, 'super_superuser');
    }

    if (unrestrictedUser) {
      const esUrl = getEsUrlFromClient(esClient);
      esClientUnrestricted = createEsClient({
        url: esUrl,
        username: unrestrictedUser.username,
        password: unrestrictedUser.password,
      });
    }
  }

  const queryString = endpointAgentIds.map((id) => `(${id})`).join(' OR ');

  const deleteResponse = await esClientUnrestricted.deleteByQuery({
    index: '*,.*',
    body: {
      query: {
        query_string: {
          query: queryString,
        },
      },
    },
    ignore_unavailable: true,
    conflicts: 'proceed',
  });

  log.verbose(`All deleted documents:\n`, deleteResponse);

  return {
    count: deleteResponse.deleted ?? 0,
    query: queryString,
    response: deleteResponse,
  };
};

const getEsUrlFromClient = (esClient: Client) => {
  const connection = esClient.connectionPool.connections.find((entry) => entry.status === 'alive');

  if (!connection) {
    throw new Error(
      'Unable to get esClient connection information. No connection found with status `alive`'
    );
  }

  const url = new URL(connection.url.href);
  url.username = '';
  url.password = '';

  return url.href;
};
