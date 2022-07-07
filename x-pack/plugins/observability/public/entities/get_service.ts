/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart, IKibanaSearchRequest } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import { rangeQuery } from '../../common/utils/queries';
import { EntityService } from './types';

const HARD_CODED_APM_INDICES =
  'remote_cluster:apm-*,remote_cluster:metrics-apm*,apm-*,metrics-apm*';

export interface GetServiceOptions {
  name: EntityService['name'];
  environment: EntityService['environment'];
  client: DataPublicPluginStart;
  start: number;
  end: number;
}

export async function getService({
  name,
  environment,
  client,
  start,
  end,
}: GetServiceOptions): Promise<EntityService> {
  const request: IKibanaSearchRequest = {
    id: 'get_service',
    params: {
      index: HARD_CODED_APM_INDICES,
      size: 1,
      query: {
        bool: {
          filter: [
            {
              term: {
                'service.name': name,
              },
            },
            {
              term: {
                'service.environment': environment,
              },
            },
            ...rangeQuery(start, end),
          ],
        },
      },
    },
  };

  // console.log('getService', request);

  // TODO: use typed ES response
  const { rawResponse } = await lastValueFrom(client.search.search(request));
  const doc = rawResponse.hits?.hits[0]?._source ?? {};

  return doc.service;
}
