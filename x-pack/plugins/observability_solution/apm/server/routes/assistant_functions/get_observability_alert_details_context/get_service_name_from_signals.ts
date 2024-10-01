/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { rangeQuery, termQuery, typedSearch } from '@kbn/observability-plugin/server/utils/queries';
import * as t from 'io-ts';
import moment from 'moment';
import { ESSearchRequest } from '@kbn/es-types';
import { alertDetailsContextRt } from '@kbn/observability-plugin/server/services';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  APMEventClient,
  APMEventESSearchRequest,
} from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { RollupInterval } from '../../../../common/rollup';
import { maybe } from '../../../../common/utils/maybe';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';

export async function getServiceNameFromSignals({
  query,
  esClient,
  logSourcesService,
  apmEventClient,
}: {
  query: t.TypeOf<typeof alertDetailsContextRt>;
  esClient: ElasticsearchClient;
  logSourcesService: LogSourcesService;
  apmEventClient: APMEventClient;
}) {
  if (query['service.name']) {
    return query['service.name'];
  }

  if (!query['kubernetes.pod.name'] && !query['container.id']) {
    return;
  }

  const start = moment(query.alert_started_at).subtract(30, 'minutes').valueOf();
  const end = moment(query.alert_started_at).valueOf();

  const params: APMEventESSearchRequest['body'] = {
    terminate_after: 1,
    size: 1,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                ...termQuery('container.id', query['container.id']),
                ...termQuery('kubernetes.pod.name', query['kubernetes.pod.name']),
              ],
              minimum_should_match: 1,
            },
          },
          { exists: { field: 'service.name' } },
          ...rangeQuery(start, end),
        ],
      },
    },
  };

  const serviceName = await getServiceNameFromTraces({
    params,
    apmEventClient,
  });

  if (serviceName) {
    return serviceName;
  }

  return getServiceNameFromLogs({ params, esClient, logSourcesService });
}

async function getServiceNameFromLogs({
  params,
  esClient,
  logSourcesService,
}: {
  params: ESSearchRequest['body'];
  esClient: ElasticsearchClient;
  logSourcesService: LogSourcesService;
}): Promise<string | undefined> {
  const index = await logSourcesService.getFlattenedLogSources();
  const res = await typedSearch(esClient, {
    index,
    ...params,
    fields: ['service.name'],
  });

  const hit = maybe(res.hits.hits[0]);

  const event = unflattenKnownApmEventFields(hit?.fields, asMutableArray([SERVICE_NAME] as const));

  return event?.service.name;
}

async function getServiceNameFromTraces({
  params,
  apmEventClient,
}: {
  params: APMEventESSearchRequest['body'];
  apmEventClient: APMEventClient;
}): Promise<string | undefined> {
  const res = await apmEventClient.search('get_service_name_from_traces', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.TransactionEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      ...params,
      fields: asMutableArray([SERVICE_NAME] as const),
    },
  });

  const hit = maybe(res.hits.hits[0]);

  const event = unflattenKnownApmEventFields(hit?.fields, asMutableArray([SERVICE_NAME] as const));

  return event?.service.name;
}
