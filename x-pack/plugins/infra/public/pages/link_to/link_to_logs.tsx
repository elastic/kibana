/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { RedirectToLogs } from './redirect_to_logs';
import { RedirectToNodeLogs } from './redirect_to_node_logs';
import { inventoryModels } from '../../../common/inventory_models';

interface LinkToPageProps {
  match: RouteMatch<{}>;
  location: {
    search: string;
  };
}

const ITEM_TYPES = inventoryModels.map((m) => m.id).join('|');

/**
 * @deprecated Link-to routes shouldn't be used anymore
 * Instead please use locators registered for the infra plugin
 * LogsLocator & NodeLogsLocator
 */
export const LinkToLogsPage: React.FC<LinkToPageProps> = (props) => {
  return (
    <Switch>
      <Route
        path={`${props.match.url}/:logViewId?/:nodeType(${ITEM_TYPES})-logs/:nodeId`}
        component={RedirectToNodeLogs}
      />
      <Route path={`${props.match.url}/:logViewId?/logs`} component={RedirectToLogs} />
      <Route path={`${props.match.url}/:logViewId?`} component={RedirectToLogs} />
      <Redirect to="/" />
    </Switch>
  );
};
