/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keyBy } from 'lodash';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  AGENT_NAME,
  EVENT_OUTCOME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { ProcessorEvent } from '../../../../common/processor_event';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import { joinByKey } from '../../../../common/utils/join_by_key';

export const getDestinationMap = async ({
  apmEventClient,
  serviceName,
  start,
  end,
  environment,
}: {
  apmEventClient: APMEventClient;
  serviceName: string;
  start: number;
  end: number;
  environment: string;
}) => {
  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.span],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
            { range: rangeFilter(start, end) },
            ...getEnvironmentUiFilterES(environment),
          ],
        },
      },
      aggs: {
        connections: {
          composite: {
            size: 1000,
            sources: [
              {
                [SPAN_DESTINATION_SERVICE_RESOURCE]: {
                  terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE },
                },
              },
              { [EVENT_OUTCOME]: { terms: { field: EVENT_OUTCOME } } },
            ],
          },
          aggs: {
            docs: {
              top_hits: {
                docvalue_fields: [SPAN_TYPE, SPAN_SUBTYPE, SPAN_ID] as const,
                _source: false,
                sort: {
                  '@timestamp': 'desc',
                },
              },
            },
          },
        },
      },
    },
  });

  const outgoingConnections =
    response.aggregations?.connections.buckets.map((bucket) => {
      const doc = bucket.docs.hits.hits[0];

      return {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: String(
          bucket.key[SPAN_DESTINATION_SERVICE_RESOURCE]
        ),
        id: String(doc.fields[SPAN_ID]?.[0]),
        [SPAN_TYPE]: String(doc.fields[SPAN_TYPE]?.[0] ?? ''),
        [SPAN_SUBTYPE]: String(doc.fields[SPAN_SUBTYPE]?.[0] ?? ''),
      };
    }) ?? [];

  const transactionResponse = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      query: {
        bool: {
          filter: [
            {
              terms: {
                [PARENT_ID]: outgoingConnections.map(
                  (connection) => connection.id
                ),
              },
            },
          ],
        },
      },
      size: outgoingConnections.length,
      docvalue_fields: [
        SERVICE_NAME,
        SERVICE_ENVIRONMENT,
        AGENT_NAME,
        PARENT_ID,
      ] as const,
      _source: false,
    },
  });

  const incomingConnections = transactionResponse.hits.hits.map((hit) => ({
    id: String(hit.fields[PARENT_ID]![0]),
    service: {
      name: String(hit.fields[SERVICE_NAME]![0]),
      environment: String(hit.fields[SERVICE_ENVIRONMENT]?.[0] ?? ''),
      agentName: hit.fields[AGENT_NAME]![0] as AgentName,
    },
  }));

  const connections = joinByKey(
    joinByKey(
      [...outgoingConnections, ...joinByKey(incomingConnections, 'service')],
      'id'
    ),
    SPAN_DESTINATION_SERVICE_RESOURCE
  );

  // map span.destination.service.resource to an instrumented service (service.name, service.environment)
  // or an external service (span.type, span.subtype)

  return keyBy(connections, SPAN_DESTINATION_SERVICE_RESOURCE);
};
