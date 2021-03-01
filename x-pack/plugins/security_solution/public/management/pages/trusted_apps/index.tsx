/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Switch, Route } from 'react-router-dom';
import React from 'react';
import { TrustedAppsPage } from './view';
import { MANAGEMENT_ROUTING_TRUSTED_APPS_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';

export function TrustedAppsContainer() {
  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_TRUSTED_APPS_PATH} exact component={TrustedAppsPage} />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
}
