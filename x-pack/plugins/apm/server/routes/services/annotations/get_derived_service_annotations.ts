/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { ESFilter } from '../../../../../../../src/core/types/elasticsearch';
import { Annotation, AnnotationType } from '../../../../common/annotations';
import {
  AGENT_EPHEMERAL_ID,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { Setup } from '../../../lib/helpers/setup_request';

export async function getDerivedServiceAnnotations({
  setup,
  serviceName,
  environment,
  searchAggregatedTransactions,
  start,
  end,
}: {
  serviceName: string;
  environment: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...getDocumentTypeFilterForTransactions(searchAggregatedTransactions),
    ...environmentQuery(environment),
  ];

  const agents =
    (
      await apmEventClient.search('get_derived_service_annotations', {
        apm: {
          events: [
            getProcessorEventForTransactions(searchAggregatedTransactions),
          ],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: [...filter, ...rangeQuery(start, end)],
            },
          },
          aggs: {
            agents: {
              terms: {
                field: AGENT_EPHEMERAL_ID,
              },
            },
          },
        },
      })
    ).aggregations?.agents.buckets.map((bucket) => bucket.key) ?? [];

    const annotations = await Promise.all(
      agents.map(async (agent) => {
        const response = await apmEventClient.search(
          'get_first_seen_of_agent',
          {
            apm: {
              events: [
                getProcessorEventForTransactions(searchAggregatedTransactions),
              ],
            },
            body: {
              size: 1,
              query: {
                bool: {
                  filter: [...filter, { term: { [AGENT_EPHEMERAL_ID]: agent } }],
                },
              },
              sort: {
                '@timestamp': 'asc',
              },
            },
          }
        );

      const firstSeen = new Date(
        response.hits.hits[0]._source['@timestamp']
      ).getTime();

      if (!isFiniteNumber(firstSeen)) {
        throw new Error(
          'First seen for agent was unexpectedly undefined or null.'
        );
      }

      if (firstSeen < start || firstSeen > end) {
        return null;
      }

      const node = response.hits.hits[0]._source.service?.node?.name;
      const version = response.hits.hits[0]._source.service?.version;

      const annotationText =
        version !== undefined
          ? i18n.translate(
              'xpack.apm.chart.annotation.nodeStartedWithVersion',
              {
                defaultMessage:
                  'Started {serviceNode} with Version {serviceVersion}',
                values: {
                  serviceNode: node,
                  serviceVersion: version,
                },
              }
            )
          : i18n.translate(
              'xpack.apm.chart.annotation.nodeStartedWithoutVersion',
              {
                defaultMessage: 'Started {serviceNode}',
                values: {
                  serviceNode: node,
                },
              }
            );

      return {
        type: AnnotationType.NODE_STARTED,
        id: agent,
        '@timestamp': firstSeen,
        text: annotationText,
      };
    })
  );
  return annotations.filter(Boolean) as Annotation[];
}
