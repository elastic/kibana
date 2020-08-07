/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageSideBar, EuiPageBody } from '@elastic/eui';

import './layout.scss';

export const Layout: React.FC = ({ children }) => {
  return (
    <EuiPage className="enterpriseSearchLayout">
      <EuiPageSideBar className="enterpriseSearchLayout__sideBar" />
      <EuiPageBody className="enterpriseSearchLayout__body">{children}</EuiPageBody>
    </EuiPage>
  );
};
