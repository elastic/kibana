/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRouter } from '../../services';
import { CLOSE_DETAIL_PANEL } from '../action_types';

export const detailPanel = () => next => action => {
  switch (action.type) {
    case CLOSE_DETAIL_PANEL:
      const { history } = getRouter();

      // Persist state to query params by removing deep link.
      history.replace({
        search: '',
      });

      break;
  }

  return next(action);
};
