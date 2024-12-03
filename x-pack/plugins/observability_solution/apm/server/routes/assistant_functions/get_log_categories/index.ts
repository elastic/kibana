/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { maybe } from '../../../../common/utils/maybe';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { flattenObject, KeyValuePair } from '../../../../common/utils/flatten_object';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { PROCESSOR_EVENT, TRACE_ID } from '../../../../common/es_fields/apm';
import { getTypedSearch } from '../../../utils/create_typed_es_client';
import { getDownstreamServiceResource } from '../get_observability_alert_details_context/get_downstream_dependency_name';
import { getShouldMatchOrNotExistFilter } from '../utils/get_should_match_or_not_exist_filter';

export interface LogCategory {
  errorCategory: string;
  docCount: number;
  sampleMessage: string;
  downstreamServiceResource?: string;
}

export async function getLogCategories({
  apmEventClient,
  esClient,
  logSourcesService,
  arguments: args,
}: {
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  logSourcesService: LogSourcesService;
  arguments: {
    start: string;
    end: string;
    entities: {
      'service.name'?: string;
      'host.name'?: string;
      'container.id'?: string;
      'kubernetes.pod.name'?: string;
    };
  };
}): Promise<{
  logCategories: LogCategory[];
  entities: KeyValuePair[];
}> {
  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const keyValueFilters = getShouldMatchOrNotExistFilter(
    Object.entries(args.entities).map(([key, value]) => ({ field: key, value }))
  );

  const index = await logSourcesService.getFlattenedLogSources();
  const search = getTypedSearch(esClient);

  const query = {
    bool: {
      must_not: [
        // exclude APM errors
        { term: { [PROCESSOR_EVENT]: 'error' } },
      ],
      filter: [
        ...keyValueFilters,
        { exists: { field: 'message' } },
        {
          range: {
            '@timestamp': {
              gte: start,
              lte: end,
            },
          },
        },
      ],
    },
  };

  const hitCountRes = await search({
    index,
    size: 0,
    track_total_hits: true,
    query,
  });
  const totalDocCount = hitCountRes.hits.total.value;
  const rawSamplingProbability = Math.min(100_000 / totalDocCount, 1);
  const samplingProbability = rawSamplingProbability < 0.5 ? rawSamplingProbability : 1;

  const fields = asMutableArray(['message', TRACE_ID] as const);
  const categorizedLogsRes = await search({
    index,
    size: 1,
    _source: Object.keys(args.entities),
    track_total_hits: 0,
    query,
    aggs: {
      sampling: {
        random_sampler: {
          probability: samplingProbability,
        },
        aggs: {
          categories: {
            categorize_text: {
              field: 'message',
              size: 10,
            },
            aggs: {
              sample: {
                top_hits: {
                  sort: { '@timestamp': 'desc' as const },
                  size: 1,
                  fields,
                },
              },
            },
          },
        },
      },
    },
  });

  const promises = categorizedLogsRes.aggregations?.sampling.categories?.buckets.map(
    async ({ doc_count: docCount, key, sample }) => {
      const hit = sample.hits.hits[0];
      const event = unflattenKnownApmEventFields(hit?.fields);

      const sampleMessage = event.message as string;
      const sampleTraceId = event.trace?.id;
      const errorCategory = key as string;

      if (!sampleTraceId) {
        return { errorCategory, docCount, sampleMessage };
      }

      const downstreamServiceResource = await getDownstreamServiceResource({
        traceId: sampleTraceId,
        start,
        end,
        apmEventClient,
      });

      return { errorCategory, docCount, sampleMessage, downstreamServiceResource };
    }
  );

  const event = unflattenKnownApmEventFields(maybe(categorizedLogsRes.hits.hits[0])?.fields);

  const sampleDoc = event as Record<string, string>;

  return {
    logCategories: await Promise.all(promises ?? []),
    entities: flattenObject(sampleDoc),
  };
}
