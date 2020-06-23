/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';

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

export const LinkToLogsPage: React.FC<LinkToPageProps> = (props) => {
  return (
    <Switch>
      <Route
        path={`${props.match.url}/:sourceId?/:nodeType(${ITEM_TYPES})-logs/:nodeId`}
        component={RedirectToNodeLogs}
      />
      <Route path={`${props.match.url}/:sourceId?`} component={RedirectToLogs} />
      <Redirect to="/" />
    </Switch>
  );
};
