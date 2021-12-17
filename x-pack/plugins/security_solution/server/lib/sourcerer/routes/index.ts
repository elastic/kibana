/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient, StartServicesAccessor } from 'kibana/server';

import type {
  DataView,
  DataViewListItem,
} from '../../../../../../../src/plugins/data_views/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectAction } from '../../../../../security/server/audit/audit_events';
import { DEFAULT_TIME_FIELD, SOURCERER_API_URL } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import type { SetupPlugins, StartPlugins } from '../../../plugin';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { sourcererSavedObjectEvent } from './audit_log';
import { findExistingIndices } from './helpers';
import { sourcererDataViewSchema, sourcererSchema } from './schema';

export const createSourcererDataViewRoute = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>,
  security: SetupPlugins['security']
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
      const siemClient = context.securitySolution?.getAppClient();
      const dataViewId = siemClient.getSourcererDataViewId();
      const unsecuredSavedObjectClient = context.core.savedObjects.getClient({
        excludedWrappers: ['security'],
      });
      try {
        const [
          ,
          {
            data: { indexPatterns },
          },
        ] = await getStartServices();
        const auditLogger = security?.audit.asSystem(request);
        /*
         * Note for future engineer
         * We need to have two different DataViewService because one will be to access all
         * the data views that the user can access and the UnsecuredDataViewService will be
         * to create the security solution data view
         */
        const unsecuredDataViewService = await indexPatterns.dataViewsServiceFactory(
          unsecuredSavedObjectClient,
          context.core.elasticsearch.client.asCurrentUser,
          request,
          true
        );
        const dataViewService = await indexPatterns.dataViewsServiceFactory(
          context.core.savedObjects.client,
          context.core.elasticsearch.client.asCurrentUser,
          request
        );

        let allDataViews: DataViewListItem[] = [];
        try {
          allDataViews = await dataViewService.getIdsWithTitle();
        } catch (error) {
          // DO nothing because we will return at least one data view.
          // let's not block the security solution users
        }
        let siemDataView;
        try {
          siemDataView = await unsecuredDataViewService.get(dataViewId);
          auditLogger?.log(
            sourcererSavedObjectEvent({
              action: SavedObjectAction.GET,
              id: dataViewId,
            })
          );
        } catch (error) {
          // if does not exist, it is all good
        }
        const { patternList } = request.body;
        const patternListAsTitle = patternList.sort().join();
        const siemDataViewTitle = siemDataView ? siemDataView.title.split(',').sort().join() : '';
        if (siemDataView == null) {
          auditLogger?.log(
            sourcererSavedObjectEvent({
              action: SavedObjectAction.CREATE,
              outcome: 'unknown',
              id: dataViewId,
            })
          );
          try {
            siemDataView = await unsecuredDataViewService.createAndSave({
              allowNoIndex: true,
              id: dataViewId,
              title: patternListAsTitle,
              timeFieldName: DEFAULT_TIME_FIELD,
            });
          } catch (error) {
            auditLogger?.log(
              sourcererSavedObjectEvent({
                action: SavedObjectAction.CREATE,
                id: dataViewId,
                error,
              })
            );
            throw error;
          }
        } else if (patternListAsTitle !== siemDataViewTitle) {
          siemDataView.title = patternListAsTitle;
          auditLogger?.log(
            sourcererSavedObjectEvent({
              action: SavedObjectAction.UPDATE,
              outcome: 'unknown',
              id: dataViewId,
            })
          );
          try {
            await unsecuredDataViewService.updateSavedObject(siemDataView);
          } catch (error) {
            auditLogger?.log(
              sourcererSavedObjectEvent({
                action: SavedObjectAction.UPDATE,
                id: dataViewId,
                error,
              })
            );
            throw error;
          }
        }

        if (allDataViews.some((dv) => dv.id === dataViewId)) {
          allDataViews = allDataViews.map((v) =>
            v.id === dataViewId ? { ...v, title: patternListAsTitle } : v
          );
        } else {
          allDataViews.push({ ...siemDataView, id: siemDataView.id ?? dataViewId });
        }

        const defaultDataView = await buildDefaultDataview(
          siemDataView,
          context.core.elasticsearch.client.asCurrentUser
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
  getStartServices: StartServicesAccessor<StartPlugins>,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: SOURCERER_API_URL,
      validate: {
        query: buildRouteValidation(sourcererDataViewSchema),
      },
      options: {
        authRequired: true,
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const siemClient = context.securitySolution?.getAppClient();
      const { dataViewId } = request.query;
      const dataViewBySecuritySolutionId = siemClient.getSourcererDataViewId();
      const unsecuredSavedObjectClient = context.core.savedObjects.getClient({
        excludedWrappers: ['security'],
      });
      try {
        const [
          ,
          {
            data: { indexPatterns },
          },
        ] = await getStartServices();
        const auditLogger = security?.audit.asSystem(request);
        /*
         * Note for future engineer
         * We need to have two different DataViewService because one will be to access all
         * the data views that the user can access and the UnsecuredDataViewService will be
         * to get the security solution data view
         */
        const unsecuredDataViewService = await indexPatterns.dataViewsServiceFactory(
          unsecuredSavedObjectClient,
          context.core.elasticsearch.client.asCurrentUser,
          request,
          true
        );
        const dataViewService = await indexPatterns.dataViewsServiceFactory(
          context.core.savedObjects.client,
          context.core.elasticsearch.client.asCurrentUser,
          request
        );

        let siemDataView;
        if (dataViewId === dataViewBySecuritySolutionId) {
          siemDataView = await unsecuredDataViewService.get(dataViewId);
          auditLogger?.log(
            sourcererSavedObjectEvent({
              action: SavedObjectAction.GET,
              id: dataViewId,
            })
          );
        } else {
          siemDataView = await dataViewService.get(dataViewId);
        }

        const kibanaDataView = siemDataView
          ? await buildDefaultDataview(
              siemDataView,
              context.core.elasticsearch.client.asCurrentUser
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

const buildDefaultDataview = async (
  dataView: DataView,
  clientAsCurrentUser: ElasticsearchClient
) => {
  const patternList = dataView.title.split(',');
  const activePatternBools: boolean[] = await findExistingIndices(patternList, clientAsCurrentUser);
  const activePatternLists: string[] = patternList.filter(
    (pattern, j, self) => self.indexOf(pattern) === j && activePatternBools[j]
  );
  return { ...dataView, patternList: activePatternLists };
};
