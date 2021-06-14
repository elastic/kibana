/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiPage, EuiPageSideBar, EuiPageBody, EuiCallOut } from '@elastic/eui';

import { AccountHeader } from '..';
import { AppLogic } from '../../../app_logic';

import { SourceSubNav } from '../../../views/content_sources/components/source_sub_nav';

import {
  PRIVATE_DASHBOARD_READ_ONLY_MODE_WARNING,
  PRIVATE_CAN_CREATE_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION,
  PRIVATE_CAN_CREATE_PAGE_DESCRIPTION,
} from '../../../views/content_sources/constants';
import { ViewContentHeader } from '../../shared/view_content_header';

import './sources.scss';

interface LayoutProps {
  restrictWidth?: boolean;
  readOnlyMode?: boolean;
}

export const PersonalDashboardLayout: React.FC<LayoutProps> = ({
  children,
  restrictWidth,
  readOnlyMode,
}) => {
  const {
    account: { canCreatePersonalSources },
  } = useValues(AppLogic);

  const PAGE_TITLE = canCreatePersonalSources
    ? PRIVATE_CAN_CREATE_PAGE_TITLE
    : PRIVATE_VIEW_ONLY_PAGE_TITLE;
  const PAGE_DESCRIPTION = canCreatePersonalSources
    ? PRIVATE_CAN_CREATE_PAGE_DESCRIPTION
    : PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION;

  return (
    <>
      <AccountHeader />
      <EuiPage className="enterpriseSearchLayout personalDashboardLayout">
        <EuiPageSideBar className="enterpriseSearchLayout__sideBar personalDashboardLayout__sideBar">
          <ViewContentHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
          <SourceSubNav />
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
