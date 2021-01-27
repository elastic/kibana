/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'kibana/server';
import { FieldDescriptor, IndexPatternsFetcher } from '../../../../../src/plugins/data/server';

export interface IndexPatternTitleAndFields {
  title: string;
  fields: FieldDescriptor[];
}

export const getEventLogIndexPattern = async ({
  index,
  esClient,
}: {
  index: string;
  esClient: ElasticsearchClient;
}): Promise<IndexPatternTitleAndFields | undefined> => {
  const indexPatternsFetcher = new IndexPatternsFetcher(esClient);

  try {
    const fields = await indexPatternsFetcher.getFieldsForWildcard({
      pattern: index,
    });

    return {
      fields,
      title: index,
    };
  } catch (e) {
    const notExists = e.output?.statusCode === 404;
    if (notExists) {
      // eslint-disable-next-line no-console
      console.error(`Could not get dynamic index pattern because indices "${index}" don't exist`);
      return;
    }

    // re-throw
    throw e;
  }
};
