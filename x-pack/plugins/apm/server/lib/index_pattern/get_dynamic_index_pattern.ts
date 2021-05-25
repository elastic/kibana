/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndexPatternsFetcher,
  FieldDescriptor,
} from '../../../../../../src/plugins/data/server';
import { APMRouteHandlerResources } from '../../routes/typings';
import { withApmSpan } from '../../utils/with_apm_span';

export interface IndexPatternTitleAndFields {
  title: string;
  timeFieldName: string;
  fields: FieldDescriptor[];
}

// TODO: this is currently cached globally. In the future we might want to cache this per user
export const getDynamicIndexPattern = ({
  config,
  context,
  logger,
}: Pick<APMRouteHandlerResources, 'logger' | 'config' | 'context'>) => {
  return withApmSpan('get_dynamic_index_pattern', async () => {
    const indexPatternTitle = config['apm_oss.indexPattern'];

    const indexPatternsFetcher = new IndexPatternsFetcher(
      context.core.elasticsearch.client.asCurrentUser
    );

    // Since `getDynamicIndexPattern` is called in setup_request (and thus by every endpoint)
    // and since `getFieldsForWildcard` will throw if the specified indices don't exist,
    // we have to catch errors here to avoid all endpoints returning 500 for users without APM data
    // (would be a bad first time experience)
    try {
      const fields = await indexPatternsFetcher.getFieldsForWildcard({
        pattern: indexPatternTitle,
      });

      const indexPattern: IndexPatternTitleAndFields = {
        fields,
        timeFieldName: '@timestamp',
        title: indexPatternTitle,
      };

      return indexPattern;
    } catch (e) {
      const notExists = e.output?.statusCode === 404;
      if (notExists) {
        logger.error(
          `Could not get dynamic index pattern because indices "${indexPatternTitle}" don't exist`
        );
        return;
      }

      // re-throw
      throw e;
    }
  });
};
