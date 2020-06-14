/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from '../../../../../../src/plugins/data/public';
import {
  AlertResultList,
  AlertDetails,
  AlertListState,
} from '../../../common/endpoint_alerts/types';
import { AlertConstants } from '../../../common/endpoint_alerts/alert_constants';
import { ImmutableMiddlewareFactory } from '../../common/store';
import { cloneHttpFetchQuery } from '../../common/utils/clone_http_fetch_query';

import {
  isOnAlertPage,
  apiQueryParams,
  uiQueryParams,
  hasSelectedAlert,
  isAlertPageTabChange,
} from './selectors';

let lastSelectedAlert: string | null = null;
/**
 * @returns <boolean> true once per change of `selectedAlert` in query params.
 *
 * As opposed to `hasSelectedAlert` which always returns true if the alert is present
 * query params, which can cause unnecessary requests and re-renders in some cases.
 */
const selectedAlertHasChanged = (params: ReturnType<typeof uiQueryParams>): boolean => {
  const { selected_alert: selectedAlert } = params;
  if (typeof selectedAlert !== 'string') {
    return false;
  }
  if (selectedAlert === lastSelectedAlert) {
    return false;
  }
  lastSelectedAlert = selectedAlert;
  return true;
};

export const alertMiddlewareFactory: ImmutableMiddlewareFactory<AlertListState> = (
  coreStart,
  depsStart
) => {
  async function fetchIndexPatterns(): Promise<IIndexPattern[]> {
    const { indexPatterns } = depsStart.data;
    const eventsPattern: { indexPattern: string } = await coreStart.http.get(
      `${AlertConstants.INDEX_PATTERN_ROUTE}/${AlertConstants.EVENT_DATASET}`
    );
    const fields = await indexPatterns.getFieldsForWildcard({
      pattern: eventsPattern.indexPattern,
    });
    const indexPattern: IIndexPattern = {
      title: eventsPattern.indexPattern,
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

      if (hasSelectedAlert(state) && selectedAlertHasChanged(uiQueryParams(state))) {
        const uiParams = uiQueryParams(state);
        const detailsResponse: AlertDetails = await coreStart.http.get(
          `/api/endpoint/alerts/${uiParams.selected_alert}`
        );
        api.dispatch({ type: 'serverReturnedAlertDetailsData', payload: detailsResponse });
      }
    }
  };
};
