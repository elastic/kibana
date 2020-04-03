/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';
import { AlertResultList, AlertDetails } from '../../../../../common/types';
import { AppAction } from '../action';
import { MiddlewareFactory, AlertListState } from '../../types';
import { isOnAlertPage, apiQueryParams, hasSelectedAlert, uiQueryParams } from './selectors';
import { cloneHttpFetchQuery } from '../../../../common/clone_http_fetch_query';
import { EndpointAppConstants } from '../../../../../common/types';

export const alertMiddlewareFactory: MiddlewareFactory<AlertListState> = (coreStart, depsStart) => {
  async function fetchIndexPatterns(): Promise<IIndexPattern[]> {
    const { indexPatterns } = depsStart.data;
    const indexName = EndpointAppConstants.ALERT_INDEX_NAME;
    const fields = await indexPatterns.getFieldsForWildcard({ pattern: indexName });
    const indexPattern: IIndexPattern = {
      title: indexName,
      fields,
    };

    return [indexPattern];
  }

  return api => next => async (action: AppAction) => {
    next(action);
    const state = api.getState();
    if (action.type === 'userChangedUrl' && isOnAlertPage(state)) {
      const patterns = await fetchIndexPatterns();
      api.dispatch({ type: 'serverReturnedSearchBarIndexPatterns', payload: patterns });

      const response: AlertResultList = await coreStart.http.get(`/api/endpoint/alerts`, {
        query: cloneHttpFetchQuery(apiQueryParams(state)),
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    }

    if (action.type === 'userChangedUrl' && isOnAlertPage(state) && hasSelectedAlert(state)) {
      const uiParams = uiQueryParams(state);
      const response: AlertDetails = await coreStart.http.get(
        `/api/endpoint/alerts/${uiParams.selected_alert}`
      );
      api.dispatch({ type: 'serverReturnedAlertDetailsData', payload: response });
    }
  };
};
