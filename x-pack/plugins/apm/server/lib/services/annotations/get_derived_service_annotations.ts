/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isNumber } from 'lodash';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Annotation, AnnotationType } from '../../../../common/annotations';
import { SetupTimeRange, Setup } from '../../helpers/setup_request';
import { ESFilter } from '../../../../typings/elasticsearch';
import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  SERVICE_NAME,
  SERVICE_VERSION,
} from '../../../../common/elasticsearch_fieldnames';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';

export async function getDerivedServiceAnnotations({
  setup,
  serviceName,
  environment,
}: {
  serviceName: string;
  environment?: string;
  setup: Setup & SetupTimeRange;
}) {
  const { start, end, apmEventClient } = setup;

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...getEnvironmentUiFilterES(environment),
  ];

  const versions =
    (
      await apmEventClient.search({
        apm: {
          events: [ProcessorEvent.transaction],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: [...filter, { range: rangeFilter(start, end) }],
            },
          },
          aggs: {
            versions: {
              terms: {
                field: SERVICE_VERSION,
              },
            },
          },
        },
      })
    ).aggregations?.versions.buckets.map((bucket) => bucket.key) ?? [];

  if (versions.length <= 1) {
    return [];
  }
  const annotations = await Promise.all(
    versions.map(async (version) => {
      const response = await apmEventClient.search({
        apm: {
          events: [ProcessorEvent.transaction],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: [...filter, { term: { [SERVICE_VERSION]: version } }],
            },
          },
          aggs: {
            first_seen: {
              min: {
                field: '@timestamp',
              },
            },
          },
        },
      });

      const firstSeen = response.aggregations?.first_seen.value;

      if (!isNumber(firstSeen)) {
        throw new Error(
          'First seen for version was unexpectedly undefined or null.'
        );
      }

      if (firstSeen < start || firstSeen > end) {
        return null;
      }

      return {
        type: AnnotationType.VERSION,
        id: version,
        '@timestamp': firstSeen,
        text: version,
      };
    })
  );
  return annotations.filter(Boolean) as Annotation[];
}
