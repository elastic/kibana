/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';
import { unwrapEsResponse } from '../../../../../observability/server';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { ESSearchResponse } from '../../../../../../typings/elasticsearch';
import { Annotation as ESAnnotation } from '../../../../../observability/common/annotations';
import { ScopedAnnotationsClient } from '../../../../../observability/server';
import { Annotation, AnnotationType } from '../../../../common/annotations';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export async function getStoredAnnotations({
  setup,
  serviceName,
  environment,
  client,
  annotationsClient,
  logger,
}: {
  setup: Setup & SetupTimeRange;
  serviceName: string;
  environment?: string;
  client: ElasticsearchClient;
  annotationsClient: ScopedAnnotationsClient;
  logger: Logger;
}): Promise<Annotation[]> {
  const body = {
    size: 50,
    query: {
      bool: {
        filter: [
          {
            range: rangeFilter(setup.start, setup.end),
          },
          { term: { 'annotation.type': 'deployment' } },
          { term: { tags: 'apm' } },
          { term: { [SERVICE_NAME]: serviceName } },
          ...getEnvironmentUiFilterES(environment),
        ],
      },
    },
  };

  try {
    const response: ESSearchResponse<
      ESAnnotation,
      { body: typeof body }
    > = await unwrapEsResponse(
      client.search<any>({
        index: annotationsClient.index,
        body,
      })
    );

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

    if (error.body?.error?.type === 'security_exception') {
      logger.warn(
        `Unable to get stored annotations due to a security exception. Please make sure that the user has 'indices:data/read/search' permissions for ${annotationsClient.index}`
      );
      return [];
    }

    throw error;
  }
}
