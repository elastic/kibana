/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo, useReducer } from 'react';

import { ManageRoutesSpyProps, RouteSpyState, RouteSpyAction } from './types';
import { RouterSpyStateContext, initRouteSpy } from './helpers';

const ManageRoutesSpyComponent: FC<ManageRoutesSpyProps> = ({ children }) => {
  const reducerSpyRoute = (state: RouteSpyState, action: RouteSpyAction) => {
    switch (action.type) {
      case 'updateRoute':
        return action.route;
      case 'updateRouteWithOutSearch':
        return { ...state, ...action.route };
      case 'updateSearch':
        return { ...state, search: action.search };
      default:
        return state;
    }
  };

  return (
    <RouterSpyStateContext.Provider value={useReducer(reducerSpyRoute, initRouteSpy)}>
      {children}
    </RouterSpyStateContext.Provider>
  );
};

export const ManageRoutesSpy = memo(ManageRoutesSpyComponent);
