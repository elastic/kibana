/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { aiAssistantLogsIndexPattern } from '@kbn/observability-ai-assistant-plugin/common';
import { rangeQuery, typedSearch } from '@kbn/observability-plugin/server/utils/queries';
import * as t from 'io-ts';
import moment from 'moment';
import { ESSearchRequest } from '@kbn/es-types';
import { alertDetailsContextRt } from '@kbn/observability-plugin/server/services';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  APMEventClient,
  APMEventESSearchRequest,
} from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { RollupInterval } from '../../../../common/rollup';

export async function getContainerIdFromSignals({
  query,
  esClient,
  coreContext,
  apmEventClient,
}: {
  query: t.TypeOf<typeof alertDetailsContextRt>;
  esClient: ElasticsearchClient;
  coreContext: Pick<CoreRequestHandlerContext, 'uiSettings'>;
  apmEventClient: APMEventClient;
}) {
  if (query['container.id']) {
    return query['container.id'];
  }

  if (!query['service.name']) {
    return;
  }

  const start = moment(query.alert_started_at).subtract(30, 'minutes').valueOf();
  const end = moment(query.alert_started_at).valueOf();

  const params: APMEventESSearchRequest['body'] = {
    _source: ['container.id'],
    terminate_after: 1,
    size: 1,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          { term: { 'service.name': query['service.name'] } },
          { exists: { field: 'container.id' } },
          ...rangeQuery(start, end),
        ],
      },
    },
  };
  const containerId = await getContainerIdFromTraces({
    params,
    apmEventClient,
  });

  if (containerId) {
    return containerId;
  }

  return getContainerIdFromLogs({ params, esClient, coreContext });
}

async function getContainerIdFromLogs({
  params,
  esClient,
  coreContext,
}: {
  params: ESSearchRequest['body'];
  esClient: ElasticsearchClient;
  coreContext: Pick<CoreRequestHandlerContext, 'uiSettings'>;
}) {
  const index = await coreContext.uiSettings.client.get<string>(aiAssistantLogsIndexPattern);
  const res = await typedSearch<{ container: { id: string } }, any>(esClient, {
    index,
    ...params,
  });

  return res.hits.hits[0]?._source?.container?.id;
}

async function getContainerIdFromTraces({
  params,
  apmEventClient,
}: {
  params: APMEventESSearchRequest['body'];
  apmEventClient: APMEventClient;
}) {
  const res = await apmEventClient.search('get_container_id_from_traces', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.TransactionEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: params,
  });

  return res.hits.hits[0]?._source.container?.id;
}
