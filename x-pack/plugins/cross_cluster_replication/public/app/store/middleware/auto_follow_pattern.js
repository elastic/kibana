/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routing from '../../services/routing';
import * as t from '../action_types';

export const autoFollowPatternMiddleware = () => next => action => {
  const { type, payload } = action;

  switch (type) {
    case t.AUTO_FOLLOW_PATTERN_DETAIL_PANEL:
      if (!routing.userHasLeftApp && !payload) {
        const { history } = routing.reactRouter;

        // Persist state to query params by removing deep link.
        history.replace({
          search: '',
        });
      }

      break;
  }

  return next(action);
};
