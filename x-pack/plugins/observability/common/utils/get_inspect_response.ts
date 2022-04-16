/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { KibanaRequest } from '@kbn/core/server';
import type { RequestStatistics, RequestStatus } from '@kbn/inspector-plugin';
import { InspectResponse } from '../../typings/common';
import { WrappedElasticsearchClientError } from './unwrap_es_response';

/**
 * Get statistics to show on inspector tab.
 *
 * If you're using searchSource (which we're not), this gets populated from
 * https://github.com/elastic/kibana/blob/c7d742cb8b8935f3812707a747a139806e4be203/src/plugins/data/common/search/search_source/inspect/inspector_stats.ts
 *
 * We do most of the same here, but not using searchSource.
 */
function getStats({
  esRequestParams,
  esResponse,
  kibanaRequest,
}: {
  esRequestParams: Record<string, any>;
  esResponse: any;
  kibanaRequest: KibanaRequest;
}) {
  const stats: RequestStatistics = {
    ...(kibanaRequest.query
      ? {
          kibanaApiQueryParameters: {
            label: i18n.translate(
              'xpack.observability.inspector.stats.kibanaApiQueryParametersLabel',
              {
                defaultMessage: 'Kibana API query parameters',
              }
            ),
            description: i18n.translate(
              'xpack.observability.inspector.stats.kibanaApiQueryParametersDescription',
              {
                defaultMessage:
                  'The query parameters used in the Kibana API request that initiated the Elasticsearch request.',
              }
            ),
            value: JSON.stringify(kibanaRequest.query, null, 2),
          },
        }
      : {}),
    kibanaApiRoute: {
      label: i18n.translate('xpack.observability.inspector.stats.kibanaApiRouteLabel', {
        defaultMessage: 'Kibana API route',
      }),
      description: i18n.translate('xpack.observability.inspector.stats.kibanaApiRouteDescription', {
        defaultMessage:
          'The route of the Kibana API request that initiated the Elasticsearch request.',
      }),
      value: `${kibanaRequest.route.method.toUpperCase()} ${kibanaRequest.route.path}`,
    },
    indexPattern: {
      label: i18n.translate('xpack.observability.inspector.stats.dataViewLabel', {
        defaultMessage: 'Data view',
      }),
      value: esRequestParams.index,
      description: i18n.translate('xpack.observability.inspector.stats.dataViewDescription', {
        defaultMessage: 'The data view that connected to the Elasticsearch indices.',
      }),
    },
  };

  if (esResponse?.hits) {
    stats.hits = {
      label: i18n.translate('xpack.observability.inspector.stats.hitsLabel', {
        defaultMessage: 'Hits',
      }),
      value: `${esResponse.hits.hits.length}`,
      description: i18n.translate('xpack.observability.inspector.stats.hitsDescription', {
        defaultMessage: 'The number of documents returned by the query.',
      }),
    };
  }

  if (esResponse?.took) {
    stats.queryTime = {
      label: i18n.translate('xpack.observability.inspector.stats.queryTimeLabel', {
        defaultMessage: 'Query time',
      }),
      value: i18n.translate('xpack.observability.inspector.stats.queryTimeValue', {
        defaultMessage: '{queryTime}ms',
        values: { queryTime: esResponse.took },
      }),
      description: i18n.translate('xpack.observability.inspector.stats.queryTimeDescription', {
        defaultMessage:
          'The time it took to process the query. ' +
          'Does not include the time to send the request or parse it in the browser.',
      }),
    };
  }

  if (esResponse?.hits?.total !== undefined) {
    let hitsTotalValue;

    if (typeof esResponse.hits.total === 'number') {
      hitsTotalValue = esResponse.hits.total;
    } else {
      const total = esResponse.hits.total as {
        relation: string;
        value: number;
      };
      hitsTotalValue = total.relation === 'eq' ? `${total.value}` : `> ${total.value}`;
    }

    stats.hitsTotal = {
      label: i18n.translate('xpack.observability.inspector.stats.hitsTotalLabel', {
        defaultMessage: 'Hits (total)',
      }),
      value: hitsTotalValue,
      description: i18n.translate('xpack.observability.inspector.stats.hitsTotalDescription', {
        defaultMessage: 'The number of documents that match the query.',
      }),
    };
  }
  return stats;
}

/**
 * Create a formatted response to be sent in the _inspect key for use in the
 * inspector.
 */
export function getInspectResponse({
  esError,
  esRequestParams,
  esRequestStatus,
  esResponse,
  kibanaRequest,
  operationName,
  startTime,
}: {
  esError: WrappedElasticsearchClientError | null;
  esRequestParams: Record<string, any>;
  esRequestStatus: RequestStatus;
  esResponse: any;
  kibanaRequest: KibanaRequest;
  operationName: string;
  startTime: number;
}): InspectResponse[0] {
  const id = `${operationName} (${kibanaRequest.route.path})`;

  return {
    id,
    json: esRequestParams.body,
    name: id,
    response: {
      json: esError ? esError.originalError : esResponse,
    },
    startTime,
    stats: getStats({ esRequestParams, esResponse, kibanaRequest }),
    status: esRequestStatus,
  };
}
