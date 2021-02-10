/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPage, EuiPageSideBar, EuiPageBody, EuiCallOut } from '@elastic/eui';

import { PRIVATE_DASHBOARD_READ_ONLY_MODE_WARNING } from './constants';

import './sources.scss';

interface LayoutProps {
  restrictWidth?: boolean;
  readOnlyMode?: boolean;
}

export const PrivateSourcesLayout: React.FC<LayoutProps> = ({
  children,
  restrictWidth,
  readOnlyMode,
}) => {
  return (
    <EuiPage className="enterpriseSearchLayout privateSourcesLayout">
      <EuiPageSideBar className={'enterpriseSearchLayout__sideBar privateSourcesLayout__sideBar'} />
      <EuiPageBody className="enterpriseSearchLayout__body" restrictWidth={restrictWidth}>
        {readOnlyMode && (
          <EuiCallOut
            className="enterpriseSearchLayout__readOnlyMode"
            color="warning"
            iconType="lock"
            title={PRIVATE_DASHBOARD_READ_ONLY_MODE_WARNING}
          />
        )}
        {children}
      </EuiPageBody>
    </EuiPage>
  );
};
