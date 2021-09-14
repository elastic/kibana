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
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_TIME_FIELD,
  SOURCERER_API_URL,
} from '../../../../common/constants';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { sourcererSchema } from './schema';
import { StartPlugins } from '../../../plugin';
import { findExistingIndices } from './helpers';

export const createSourcererDataViewRoute = (
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
        const dataViewService = await indexPatterns.indexPatternsServiceFactory(
          context.core.savedObjects.client,
          context.core.elasticsearch.client.asInternalUser
        );

        let allDataViews = await dataViewService.getIdsWithTitle();
        const patternId = DEFAULT_DATA_VIEW_ID;
        const { patternList } = request.body;
        const siemDataView = allDataViews.find((v) => v.id === patternId);
        let defaultDataView;
        const patternListAsTitle = patternList.join();

        if (siemDataView == null) {
          defaultDataView = await dataViewService.createAndSave({
            id: patternId,
            title: patternListAsTitle,
            timeFieldName: DEFAULT_TIME_FIELD,
          });
          // ?? patternId -> type thing here, should never happen
          allDataViews.push({ ...defaultDataView, id: defaultDataView.id ?? patternId });
        } else {
          defaultDataView = { ...siemDataView, id: siemDataView.id ?? '' };
          if (patternListAsTitle !== defaultDataView.title) {
            const wholeDataView = await dataViewService.get(defaultDataView.id);
            wholeDataView.title = patternListAsTitle;
            await dataViewService.updateSavedObject(wholeDataView);
            // update the data view in allDataViews
            allDataViews = allDataViews.map((v) =>
              v.id === patternId ? { ...v, title: patternListAsTitle } : v
            );
          }
        }

        const patternLists: string[][] = allDataViews.map(({ title }) => title.split(','));
        const activePatternBools: boolean[][] = await Promise.all(
          patternLists.map((pl) =>
            findExistingIndices(pl, context.core.elasticsearch.client.asCurrentUser)
          )
        );
        const activePatternLists = patternLists.map((pl, i) =>
          // also remove duplicates from active
          pl.filter((pattern, j, self) => self.indexOf(pattern) === j && activePatternBools[i][j])
        );

        const kibanaDataViews = allDataViews.map((kip, i) => ({
          ...kip,
          patternList: activePatternLists[i],
        }));
        const body = {
          defaultDataView: kibanaDataViews.find((p) => p.id === patternId) ?? {},
          kibanaDataViews,
        };
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
