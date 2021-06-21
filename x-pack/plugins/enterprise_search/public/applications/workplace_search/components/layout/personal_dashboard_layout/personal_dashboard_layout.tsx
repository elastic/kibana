/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPage, EuiPageSideBar, EuiPageBody, EuiCallOut } from '@elastic/eui';

import { AccountHeader } from '..';

import { PRIVATE_DASHBOARD_READ_ONLY_MODE_WARNING } from '../../../views/content_sources/constants';

import './personal_dashboard_layout.scss';

interface LayoutProps {
  restrictWidth?: boolean;
  readOnlyMode?: boolean;
  sidebar: React.ReactNode;
}

export const PersonalDashboardLayout: React.FC<LayoutProps> = ({
  children,
  restrictWidth,
  readOnlyMode,
  sidebar,
}) => {
  return (
    <>
      <AccountHeader />
      <EuiPage className="enterpriseSearchLayout personalDashboardLayout">
        <EuiPageSideBar className="enterpriseSearchLayout__sideBar personalDashboardLayout__sideBar">
          {sidebar}
        </EuiPageSideBar>
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
    </>
  );
};
