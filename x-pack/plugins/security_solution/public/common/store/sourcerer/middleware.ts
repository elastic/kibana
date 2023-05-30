/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Action, Dispatch, MiddlewareAPI } from 'redux';
import type { CoreStart } from '@kbn/core/public';
import {
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_INDEX_KEY,
  DETECTION_ENGINE_INDEX_URL,
  SERVER_APP_ID,
} from '../../../../common/constants';
import * as sourcererActions from './actions';
import type { KibanaDataView, SourcererModel } from './model';
import type { StartPlugins } from '../../../types';
import { initDataView, SourcererScopeName } from './model';
import { createSourcererDataView } from '../../containers/sourcerer/create_sourcerer_data_view';

interface SourcererMiddlewareDeps {
  coreStart: CoreStart;
  startPlugins: StartPlugins;
}

const sourcererMiddleware =
  ({ coreStart, startPlugins }: SourcererMiddlewareDeps) =>
  (api: MiddlewareAPI) =>
  (next: Dispatch) => {
    return async (action: Action) => {
      next(action);
      if (action.type === sourcererActions.appInitialized.type) {
        api.dispatch(
          sourcererActions.setSourcererScopeLoading({
            id: SourcererScopeName.detections,
            loading: true,
          })
        );
        let signal: { name: string | null } = { name: null };
        try {
          if (coreStart.application.capabilities[SERVER_APP_ID].show === true) {
            signal = await coreStart.http.fetch(DETECTION_ENGINE_INDEX_URL, {
              method: 'GET',
            });
          }
        } catch {
          signal = { name: null };
        }

        const configPatternList = coreStart.uiSettings.get(DEFAULT_INDEX_KEY);
        let defaultDataView: SourcererModel['defaultDataView'];
        let kibanaDataViews: SourcererModel['kibanaDataViews'];
        try {
          // check for/generate default Security Solution Kibana data view
          const sourcererDataViews = await createSourcererDataView({
            body: {
              patternList: [...configPatternList, ...(signal.name != null ? [signal.name] : [])],
            },
            dataViewService: startPlugins.data.dataViews,
            dataViewId: `${DEFAULT_DATA_VIEW_ID}-${
              (
                await startPlugins.spaces?.getActiveSpace()
              )?.id
            }`,
          });

          if (sourcererDataViews === undefined) {
            throw new Error('');
          }
          defaultDataView = { ...initDataView, ...sourcererDataViews.defaultDataView };
          kibanaDataViews = sourcererDataViews.kibanaDataViews.map((dataView: KibanaDataView) => ({
            ...initDataView,
            ...dataView,
          }));
        } catch (error) {
          defaultDataView = { ...initDataView, error };
          kibanaDataViews = [];
        }
        api.dispatch(
          sourcererActions.sourcererInitialized({
            defaultDataView,
            kibanaDataViews,
            signalIndexName: signal.name ?? '',
          })
        );
      }
    };
  };

export const sourcererMiddlewareFactory = (deps: SourcererMiddlewareDeps) => {
  return sourcererMiddleware(deps);
};
