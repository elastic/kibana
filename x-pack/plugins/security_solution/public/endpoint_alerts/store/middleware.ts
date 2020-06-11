/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from '../../../common/endpoint/constants';
import { IIndexPattern } from '../../../../../../src/plugins/data/public';
import {
  AlertResultList,
  AlertDetails,
  AlertListState,
} from '../../../common/endpoint_alerts/types';
import { ImmutableMiddlewareFactory } from '../../common/store';
import { cloneHttpFetchQuery } from '../../common/utils/clone_http_fetch_query';
import {
  isOnAlertPage,
  apiQueryParams,
  hasSelectedAlert,
  uiQueryParams,
  isAlertPageTabChange,
} from './selectors';

export const alertMiddlewareFactory: ImmutableMiddlewareFactory<AlertListState> = (
  coreStart,
  depsStart
) => {
  async function fetchIndexPatterns(): Promise<IIndexPattern[]> {
    const { indexPatterns } = depsStart.data;
    const fields = await indexPatterns.getFieldsForWildcard({
      pattern: IndexPattern.Events,
    });
    const indexPattern: IIndexPattern = {
      title: IndexPattern.Events,
      fields,
    };

    return [indexPattern];
  }

  return (api) => (next) => async (action) => {
    next(action);
    const state = api.getState();
    if (action.type === 'userChangedUrl' && isOnAlertPage(state) && !isAlertPageTabChange(state)) {
      const patterns = await fetchIndexPatterns();
      api.dispatch({ type: 'serverReturnedSearchBarIndexPatterns', payload: patterns });

      const listResponse: AlertResultList = await coreStart.http.get(`/api/endpoint/alerts`, {
        query: cloneHttpFetchQuery(apiQueryParams(state)),
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: listResponse });

      if (hasSelectedAlert(state)) {
        const uiParams = uiQueryParams(state);
        const detailsResponse: AlertDetails = await coreStart.http.get(
          `/api/endpoint/alerts/${uiParams.selected_alert}`
        );
        api.dispatch({ type: 'serverReturnedAlertDetailsData', payload: detailsResponse });
      }
    }
  };
};
