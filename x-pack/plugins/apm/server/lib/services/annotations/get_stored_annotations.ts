/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { ESSearchResponse } from '../../../../typings/elasticsearch';
import { ScopedAnnotationsClient } from '../../../../../observability/server';
import { Annotation, AnnotationType } from '../../../../common/annotations';
import { Annotation as ESAnnotation } from '../../../../../observability/common/annotations';
import { SetupTimeRange, Setup } from '../../helpers/setup_request';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';

export async function getStoredAnnotations({
  setup,
  serviceName,
  environment,
  apiCaller,
  annotationsClient,
}: {
  setup: Setup & SetupTimeRange;
  serviceName: string;
  environment?: string;
  apiCaller: APICaller;
  annotationsClient: ScopedAnnotationsClient;
}): Promise<Annotation[]> {
  try {
    const environmentFilter = getEnvironmentUiFilterES(environment);

    const response: ESSearchResponse<ESAnnotation, any> = (await apiCaller(
      'search',
      {
        index: annotationsClient.index,
        body: {
          size: 50,
          query: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: setup.start,
                      lt: setup.end,
                    },
                  },
                },
                { term: { 'annotation.type': 'deployment' } },
                { term: { tags: 'apm' } },
                { term: { [SERVICE_NAME]: serviceName } },
                ...(environmentFilter ? [environmentFilter] : []),
              ],
            },
          },
        },
      }
    )) as any;

    return response.hits.hits.map((hit) => {
      return {
        type: AnnotationType.VERSION,
        id: hit._id,
        '@timestamp': new Date(hit._source['@timestamp']).getTime(),
        text: hit._source.message,
      };
    });
  } catch (error) {
    // index is only created when an annotation has been indexed,
    // so we should handle this error gracefully
    if (error.body?.error?.type === 'index_not_found_exception') {
      return [];
    }
    throw error;
  }
}
