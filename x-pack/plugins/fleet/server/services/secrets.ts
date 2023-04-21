/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeleteResponse, WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';

import type { Secret, SecretElasticDoc } from '../types';

import { FleetError } from '../errors';
import { SECRETS_INDEX } from '../constants';

import { appContextService } from './app_context';

export async function createSecret(opts: {
  esClient: ElasticsearchClient;
  value: string;
}): Promise<Secret> {
  const { esClient, value } = opts;
  let res: WriteResponseBase;
  try {
    res = await esClient.index<SecretElasticDoc>({
      index: SECRETS_INDEX,
      body: {
        value,
      },
    });
  } catch (e) {
    const logger = appContextService.getLogger();
    const msg = `Error writing secret to ${SECRETS_INDEX} index: ${e}`;
    logger.error(msg);
    throw new FleetError(msg);
  }

  return {
    id: res._id,
    value,
  };
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
