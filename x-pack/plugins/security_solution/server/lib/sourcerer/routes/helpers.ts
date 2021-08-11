/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import { ElasticsearchClient } from 'kibana/server';
import get from 'lodash/get';
import { IndexPattern, IndexPatternsService } from '../../../../../../../src/plugins/data/common';
import { DEFAULT_TIME_FIELD } from '../../../../common/constants';

export const findExistingIndices = async (
  indices: string[],
  esClient: ElasticsearchClient
): Promise<boolean[]> =>
  Promise.all(
    indices
      .map(async (index) => {
        const searchResponse = await esClient.search({
          index,
          body: { query: { match_all: {} }, size: 0 },
        });
        return get(searchResponse, 'body.hits.total.value', 0) > 0;
      })
      .map((p) => p.catch((e) => false))
  );

export const getKibanaIndexPattern = async (
  indexPatternsService: IndexPatternsService,
  patternList: string[],
  patternId: string
): Promise<IndexPattern> => {
  let indexPattern: IndexPattern;
  const patternListAsTitle = patternList.join();
  try {
    indexPattern = await indexPatternsService.get(patternId);
    if (patternListAsTitle !== indexPattern.title) {
      indexPattern.title = patternListAsTitle;
      await indexPatternsService.updateSavedObject(indexPattern);
    }
  } catch (e) {
    const error = transformError(e);
    console.log('ERRRR', error);
    if (error.statusCode === 404) {
      indexPattern = await indexPatternsService.createAndSave({
        id: patternId,
        title: patternListAsTitle,
        timeFieldName: DEFAULT_TIME_FIELD,
      });
    } else {
      throw e;
    }
  }
  return indexPattern;
};
