/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routing from '../../services/routing';
import * as t from '../action_types';
import { extractQueryParams } from '../../services/query_params';
import { loadAutoFollowStats } from '../actions';

export const autoFollowPatternMiddleware = ({ dispatch }) => next => action => {
  const { type, payload: name } = action;
  const { history } = routing.reactRouter;
  const search = history.location.search;
  const { pattern: patternName } = extractQueryParams(search);

  switch (type) {
    case t.AUTO_FOLLOW_PATTERN_DETAIL_PANEL:
      if (!routing.userHasLeftApp) {
        // Persist state to query params by removing deep link.
        if(!name) {
          history.replace({
            search: '',
          });
        }
        // Allow the user to share a deep link to this job.
        else if (patternName !== name) {
          history.replace({
            search: `?pattern=${encodeURIComponent(name)}`,
          });

          dispatch(loadAutoFollowStats());
        }
      }
      break;
  }

  return next(action);
};
