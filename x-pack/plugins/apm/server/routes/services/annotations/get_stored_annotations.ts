/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from 'kibana/server';
import { rangeQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  unwrapEsResponse,
  WrappedElasticsearchClientError,
} from '../../../../../observability/server';
import { ESSearchResponse } from '../../../../../../../src/core/types/elasticsearch';
import { Annotation as ESAnnotation } from '../../../../../observability/common/annotations';
import { ScopedAnnotationsClient } from '../../../../../observability/server';
import { Annotation, AnnotationType } from '../../../../common/annotations';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { withApmSpan } from '../../../utils/with_apm_span';

export function getStoredAnnotations({
  serviceName,
  environment,
  client,
  annotationsClient,
  logger,
  start,
  end,
}: {
  serviceName: string;
  environment: string;
  client: ElasticsearchClient;
  annotationsClient: ScopedAnnotationsClient;
  logger: Logger;
  start: number;
  end: number;
}): Promise<Annotation[]> {
  return withApmSpan('get_stored_annotations', async () => {
    const body = {
      size: 50,
      query: {
        bool: {
          filter: [
            { term: { 'annotation.type': 'deployment' } },
            { term: { tags: 'apm' } },
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
          ],
        },
      },
    };

    try {
      const response: ESSearchResponse<ESAnnotation, { body: typeof body }> =
        (await unwrapEsResponse(
          client.search(
            {
              index: annotationsClient.index,
              body,
            },
            { meta: true }
          )
        )) as any;

      return response.hits.hits.map((hit) => {
        return {
          type: AnnotationType.VERSION,
          id: hit._id as string,
          '@timestamp': new Date(hit._source['@timestamp']).getTime(),
          text: hit._source.message,
        };
      });
    } catch (error) {
      // index is only created when an annotation has been indexed,
      // so we should handle this error gracefully
      if (
        error instanceof WrappedElasticsearchClientError &&
        error.originalError instanceof errors.ResponseError
      ) {
        const type = error.originalError.body.error.type;

        if (type === 'index_not_found_exception') {
          return [];
        }

        if (type === 'security_exception') {
          logger.warn(
            `Unable to get stored annotations due to a security exception. Please make sure that the user has 'indices:data/read/search' permissions for ${annotationsClient.index}`
          );
          return [];
        }
      }

      throw error;
    }
  });
}
