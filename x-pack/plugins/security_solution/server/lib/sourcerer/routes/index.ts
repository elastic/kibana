/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient, StartServicesAccessor } from '@kbn/core/server';

import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import { DEFAULT_TIME_FIELD, SOURCERER_API_URL } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import type { StartPlugins } from '../../../plugin';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { findExistingIndices } from './helpers';
import { sourcererDataViewSchema, sourcererSchema } from './schema';
import { ensurePatternFormat } from '../../../../common/utils/sourcerer';

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
        authRequired: true,
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const coreContext = await context.core;
      const siemClient = (await context.securitySolution)?.getAppClient();
      const dataViewId = siemClient.getSourcererDataViewId();

      try {
        const [
          ,
          {
            data: { indexPatterns },
          },
        ] = await getStartServices();

        const dataViewService = await indexPatterns.dataViewsServiceFactory(
          coreContext.savedObjects.client,
          coreContext.elasticsearch.client.asCurrentUser,
          request,
          true
        );

        let allDataViews: DataViewListItem[] = await dataViewService.getIdsWithTitle();
        let siemDataView: DataView | DataViewListItem | null =
          allDataViews.find((dv) => dv.id === dataViewId) ?? null;

        const { patternList } = request.body;
        const patternListAsTitle = ensurePatternFormat(patternList).join();
        const siemDataViewTitle = siemDataView
          ? ensurePatternFormat(siemDataView.title.split(',')).join()
          : '';

        if (siemDataView == null) {
          try {
            siemDataView = await dataViewService.createAndSave(
              {
                allowNoIndex: true,
                id: dataViewId,
                title: patternListAsTitle,
                timeFieldName: DEFAULT_TIME_FIELD,
              },
              // Override property - if a data view exists with the security solution pattern
              // delete it and replace it with our data view
              true
            );
          } catch (err) {
            const error = transformError(err);
            if (err.name === 'DuplicateDataViewError' || error.statusCode === 409) {
              siemDataView = await dataViewService.get(dataViewId);
            } else {
              throw error;
            }
          }
        } else if (patternListAsTitle !== siemDataViewTitle) {
          siemDataView = await dataViewService.get(dataViewId);
          siemDataView.title = patternListAsTitle;
          await dataViewService.updateSavedObject(siemDataView);
        }

        if (allDataViews.some((dv) => dv.id === dataViewId)) {
          allDataViews = allDataViews.map((v) =>
            v.id === dataViewId ? { ...v, title: patternListAsTitle } : v
          );
        } else {
          allDataViews.push({ ...siemDataView, id: siemDataView.id ?? dataViewId });
        }

        const defaultDataView = await buildSourcererDataView(
          siemDataView,
          coreContext.elasticsearch.client.asCurrentUser
        );
        return response.ok({
          body: {
            defaultDataView,
            kibanaDataViews: allDataViews.map((dv) =>
              dv.id === dataViewId ? defaultDataView : dv
            ),
          },
        });
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

export const getSourcererDataViewRoute = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.get(
    {
      path: SOURCERER_API_URL,
      validate: {
        query: buildRouteValidation(sourcererDataViewSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const coreContext = await context.core;
      const { dataViewId } = request.query;
      try {
        const [
          ,
          {
            data: { indexPatterns },
          },
        ] = await getStartServices();

        const dataViewService = await indexPatterns.dataViewsServiceFactory(
          coreContext.savedObjects.client,
          coreContext.elasticsearch.client.asCurrentUser,
          request,
          true
        );
        const allDataViews: DataViewListItem[] = await dataViewService.getIdsWithTitle();
        const siemDataView: DataViewListItem | null =
          allDataViews.find((dv) => dv.id === dataViewId) ?? null;
        const kibanaDataView = siemDataView
          ? await buildSourcererDataView(
              siemDataView,
              coreContext.elasticsearch.client.asCurrentUser
            )
          : {};

        return response.ok({
          body: kibanaDataView,
        });
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

interface KibanaDataView {
  /** Uniquely identifies a Kibana Data View */
  id: string;
  /**  list of active patterns that return data  */
  patternList: string[];
  /**
   * title of Kibana Data View
   * title also serves as "all pattern list", including inactive
   * comma separated string
   */
  title: string;
}

const buildSourcererDataView = async (
  dataView: DataView | DataViewListItem,
  clientAsCurrentUser: ElasticsearchClient
): Promise<KibanaDataView> => {
  const patternList = dataView.title.split(',');
  const activePatternBools: boolean[] = await findExistingIndices(patternList, clientAsCurrentUser);
  const activePatternLists: string[] = patternList.filter(
    (pattern, j, self) => self.indexOf(pattern) === j && activePatternBools[j]
  );
  return { id: dataView.id ?? '', title: dataView.title, patternList: activePatternLists };
};
