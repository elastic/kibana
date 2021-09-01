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
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { sourcererSchema } from './schema';
import { StartPlugins } from '../../../plugin';
import { findExistingIndices } from './helpers';

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
        const indexPatternsService = await indexPatterns.indexPatternsServiceFactory(
          context.core.savedObjects.client,
          context.core.elasticsearch.client.asInternalUser
        );

        const allKips = await indexPatternsService.getIdsWithTitle();
        const patternId = DEFAULT_INDEX_PATTERN_ID;
        const { patternList } = request.body;
        const ssKip = allKips.find((v) => v.id === patternId);
        let defaultIndexPattern;
        const patternListAsTitle = patternList.join();
        if (ssKip == null) {
          defaultIndexPattern = await indexPatternsService.createAndSave({
            id: patternId,
            title: patternListAsTitle,
            timeFieldName: DEFAULT_TIME_FIELD,
          });
          // type thing here, should never happen
          allKips.push({ ...defaultIndexPattern, id: defaultIndexPattern.id ?? patternId });
        } else {
          defaultIndexPattern = { ...ssKip, id: ssKip.id ?? '' };
          if (patternListAsTitle !== defaultIndexPattern.title) {
            const wholeKip = await indexPatternsService.get(defaultIndexPattern.id);
            wholeKip.title = patternListAsTitle;
            await indexPatternsService.updateSavedObject(wholeKip);
          }
        }

        const patternLists: string[][] = allKips.map(({ title }) => title.split(','));
        const activePatternBools: boolean[][] = await Promise.all(
          patternLists.map((pl) =>
            findExistingIndices(pl, context.core.elasticsearch.client.asCurrentUser)
          )
        );
        const activePatternLists = patternLists.map((pl, i) =>
          pl.filter((pattern, j) => activePatternBools[i][j])
        );
        const kibanaIndexPatterns = allKips.map((kip, i) => ({
          ...kip,
          patternList: activePatternLists[i],
        }));
        const body = {
          defaultIndexPattern: kibanaIndexPatterns.find((p) => p.id === patternId) ?? {},
          kibanaIndexPatterns,
        };
        console.log('body', body);
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
