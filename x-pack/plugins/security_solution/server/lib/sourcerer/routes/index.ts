/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { StartServicesAccessor } from 'kibana/server';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { DEFAULT_INDEX_PATTERN_ID, SOURCERER_API_URL } from '../../../../common/constants';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { getPatternListSchema, sourcererSchema } from './schema';
import { StartPlugins } from '../../../plugin';
import { findExistingIndices, getKibanaIndexPattern } from './helpers';

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

export const getKipPatternListsRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: SOURCERER_API_URL,
      validate: {
        query: buildRouteValidation(getPatternListSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const patternLists: string[][] = request.query.titles.map((title) => title.split(','));
      const activePatternLists: boolean[][] = await Promise.all(
        patternLists.map((patternList) =>
          findExistingIndices(patternList, context.core.elasticsearch.client.asCurrentUser)
        )
      );
      const body = patternLists.map((patternList, i) =>
        patternList.filter((pattern, j) => activePatternLists[i][j])
      );
      console.log('EHHHH', JSON.stringify({ patternLists, activePatternLists, body }));

      try {
        return response.ok({ body });
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
