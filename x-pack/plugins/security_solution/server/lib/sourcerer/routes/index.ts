/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { StartServicesAccessor } from 'kibana/server';
import type { SecuritySolutionPluginRouter } from '../../../types';
import {
  DEFAULT_INDEX_PATTERN_ID,
  DEFAULT_TIME_FIELD,
  SOURCERER_API_URL,
} from '../../../../common/constants';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { IndexPattern, IndexPatternsService } from '../../../../../../../src/plugins/data/common';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { sourcererSchema } from './schema';
import { StartPlugins } from '../../../plugin';

const getKibanaIndexPattern = async (
  indexPatternsService: IndexPatternsService,
  patternList: string[],
  patternId: string
): Promise<IndexPattern> => {
  let indexPattern: IndexPattern;
  const patternListAsTitle = patternList.join(',');
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

export const createSourcererIndexPatternRoute = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>
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
        const [
          ,
          {
            data: { indexPatterns },
          },
        ] = await getStartServices();
        const indexPatternService = await indexPatterns.indexPatternsServiceFactory(
          context.core.savedObjects.client,
          context.core.elasticsearch.client.asInternalUser
        );
        const pattern = await getKibanaIndexPattern(
          indexPatternService,
          request.body.patternList,
          DEFAULT_INDEX_PATTERN_ID
        );
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
