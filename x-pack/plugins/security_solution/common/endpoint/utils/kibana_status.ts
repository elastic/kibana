/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import type { StatusResponse } from '@kbn/core-status-common-internal';
import { catchAxiosErrorFormatAndThrow } from '../format_axios_error';

export const fetchKibanaStatus = async (kbnClient: KbnClient): Promise<StatusResponse> => {
  return (await kbnClient.status.get().catch(catchAxiosErrorFormatAndThrow)) as StatusResponse;
};
/**
 * Checks to see if Kibana/ES is running in serverless mode
 * @param client
 */
export const isServerlessKibanaFlavor = async (client: KbnClient | Client): Promise<boolean> => {
  if (client instanceof KbnClient) {
    const kbnStatus = await fetchKibanaStatus(client);

    // If we don't have status for plugins, then error
    // the Status API will always return something (its an open API), but if auth was successful,
    // it will also return more data.
    if (!kbnStatus?.status?.plugins) {
      throw new Error(
        `Unable to retrieve Kibana plugins status (likely an auth issue with the username being used for kibana)`
      );
    }

    return kbnStatus.status.plugins?.serverless?.level === 'available';
  } else {
    return (await client.info()).version.build_flavor === 'serverless';
  }
};
