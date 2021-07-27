/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../types';
import {
  DEFAULT_INDEX_PATTERN_ID,
  DEFAULT_TIME_FIELD,
  SOURCERER_API_URL,
} from '../../../../common/constants';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IndexPatternsServiceStart } from '../../../../../../../src/plugins/data/server/index_patterns';
import { IndexPattern, IndexPatternsService } from '../../../../../../../src/plugins/data/common';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { sourcererSchema } from './schema';

const getKibanaIndexPattern = async (
  indexPatternsService: IndexPatternsService,
  patternList: string[]
): Promise<IndexPattern> => {
  let indexPattern: IndexPattern;
  try {
    indexPattern = await indexPatternsService.get(DEFAULT_INDEX_PATTERN_ID);
  } catch (e) {
    indexPattern = await indexPatternsService.createAndSave({
      id: DEFAULT_INDEX_PATTERN_ID,
      title: patternList.join(','),
      timeFieldName: DEFAULT_TIME_FIELD,
    });
  }
  return indexPattern;
};

export const createSourcererIndexPatternRoute = (
  router: SecuritySolutionPluginRouter,
  indexPatterns: IndexPatternsServiceStart
) => {
  router.post(
    {
      path: SOURCERER_API_URL,
      validate: {
        body: buildRouteValidation(sourcererSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const indexPatternService = await indexPatterns.indexPatternsServiceFactory(
          context.core.savedObjects.client,
          context.core.elasticsearch.client.asInternalUser
        );
        const pattern = await getKibanaIndexPattern(indexPatternService, request.body.patternList);
        return response.ok({ body: pattern });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body:
            error.statusCode === 403
              ? 'Users with write permissions need to access the Elastic Security app to initialize the app source data.'
              : error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
