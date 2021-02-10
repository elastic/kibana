/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiPage, EuiPageSideBar, EuiPageBody, EuiCallOut } from '@elastic/eui';

import { AppLogic } from '../../app_logic';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import {
  PRIVATE_DASHBOARD_READ_ONLY_MODE_WARNING,
  PRIVATE_CAN_CREATE_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION,
  PRIVATE_CAN_CREATE_PAGE_DESCRIPTION,
} from './constants';

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
    <EuiPage className="enterpriseSearchLayout privateSourcesLayout">
      <EuiPageSideBar className={'enterpriseSearchLayout__sideBar privateSourcesLayout__sideBar'}>
        <ViewContentHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
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
  );
};
