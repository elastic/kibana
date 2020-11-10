/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { useValues } from 'kea';

import { KibanaLogic } from '../shared/kibana';
import { IInitialAppData } from '../../../common/types';

import { HttpLogic } from '../shared/http';

import { ROOT_PATH, SETUP_GUIDE_PATH } from './routes';

import { ErrorConnecting } from './components/error_connecting';
import { ProductSelector } from './components/product_selector';
import { SetupGuide } from './components/setup_guide';

import './index.scss';

export const EnterpriseSearch: React.FC<IInitialAppData> = ({ access = {} }) => {
  const { errorConnecting } = useValues(HttpLogic);
  const { config } = useValues(KibanaLogic);

  const showErrorConnecting = !!(config.host && errorConnecting);

  return (
    <Switch>
      <Route exact path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route exact path={ROOT_PATH}>
        {showErrorConnecting ? <ErrorConnecting /> : <ProductSelector access={access} />}
      </Route>
    </Switch>
  );
};
