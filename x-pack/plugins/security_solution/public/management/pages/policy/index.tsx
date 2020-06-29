/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { Route, Switch } from 'react-router-dom';
import { PolicyDetails, PolicyList } from './view';
import {
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_PATH,
} from '../../common/constants';
import { NotFoundPage } from '../../../app/404';

export const PolicyContainer = memo(() => {
  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_POLICIES_PATH} exact component={PolicyList} />
      <Route path={MANAGEMENT_ROUTING_POLICY_DETAILS_PATH} exact component={PolicyDetails} />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

PolicyContainer.displayName = 'PolicyContainer';
