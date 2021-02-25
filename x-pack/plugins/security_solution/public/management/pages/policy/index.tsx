/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Route, Switch } from 'react-router-dom';
import { PolicyDetails } from './view';
import { MANAGEMENT_ROUTING_POLICY_DETAILS_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';

export const PolicyContainer = memo(() => {
  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_POLICY_DETAILS_PATH} exact component={PolicyDetails} />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

PolicyContainer.displayName = 'PolicyContainer';
