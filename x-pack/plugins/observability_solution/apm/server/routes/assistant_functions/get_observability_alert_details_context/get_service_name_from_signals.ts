/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { aiAssistantLogsIndexPattern } from '@kbn/observability-ai-assistant-plugin/common';
import { rangeQuery, termQuery, typedSearch } from '@kbn/observability-plugin/server/utils/queries';
import * as t from 'io-ts';
import moment from 'moment';
import { ApmDocumentType } from '../../../../common/document_type';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { observabilityAlertDetailsContextRt } from '.';
import { RollupInterval } from '../../../../common/rollup';

export async function getServiceNameFromSignals({
  query,
  esClient,
  coreContext,
  apmEventClient,
}: {
  query: t.TypeOf<typeof observabilityAlertDetailsContextRt>;
  esClient: ElasticsearchClient;
  coreContext: CoreRequestHandlerContext;
  apmEventClient: APMEventClient;
}) {
  if (query['service.name']) {
    return query['service.name'];
  }

  if (query['container.id']) {
    const serviceName = await getServiceNameFromTraces({
      query,
      apmEventClient,
    });

    if (serviceName) {
      return serviceName;
    }

    return getServiceNameFromLogs({ query, esClient, coreContext });
  }
}

async function getServiceNameFromLogs({
  query,
  esClient,
  coreContext,
}: {
  query: t.TypeOf<typeof observabilityAlertDetailsContextRt>;
  esClient: ElasticsearchClient;
  coreContext: CoreRequestHandlerContext;
}) {
  const index =
    (await coreContext.uiSettings.client.get<string>(aiAssistantLogsIndexPattern)) ?? 'logs-*';

  const start = moment(query.alert_started_at).subtract(30, 'minutes').unix();
  const end = moment(query.alert_started_at).unix();

  const res = await typedSearch<{ service: { name: string } }, any>(esClient, {
    index,
    _source: ['service.name'],
    terminate_after: 1,
    size: 1,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          { exists: { field: 'service.name' } },
          ...termQuery('container.id', query['container.id']),
          ...rangeQuery(start, end),
        ],
      },
    },
  });

  return res.hits.hits[0]?._source?.service?.name;
}

async function getServiceNameFromTraces({
  query,
  apmEventClient,
}: {
  query: t.TypeOf<typeof observabilityAlertDetailsContextRt>;
  apmEventClient: APMEventClient;
}) {
  const start = moment(query.alert_started_at).subtract(30, 'minutes').unix();
  const end = moment(query.alert_started_at).unix();

  const res = await apmEventClient.search('get_service_name', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.TransactionEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      _source: ['service.name'],
      terminate_after: 1,
      size: 1,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { exists: { field: 'service.name' } },
            ...termQuery('container.id', query['container.id']),
            ...rangeQuery(start, end),
          ],
        },
      },
    },
  });

  return res.hits.hits[0]?._source.service.name;
}
