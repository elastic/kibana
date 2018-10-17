/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LicenseDashboard, UploadLicense } from './sections/';
import { Switch, Route } from 'react-router-dom';
import { BASE_PATH } from '../common/constants';
import {
  EuiPage,
  EuiPageBody,
} from '@elastic/eui';

export default () => (
  <EuiPage restrictWidth>
    <EuiPageBody className="licManagement__pageBody">
      <Switch>
        <Route path={`${BASE_PATH}upload_license`} component={UploadLicense}/>
        <Route path={`${BASE_PATH}`} component={LicenseDashboard}/>
      </Switch>
    </EuiPageBody>
  </EuiPage>
);
