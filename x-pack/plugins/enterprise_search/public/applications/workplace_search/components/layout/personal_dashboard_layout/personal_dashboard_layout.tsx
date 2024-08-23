/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { useRouteMatch } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiCallOut, EuiSpacer, EuiPageTemplate } from '@elastic/eui';

import { AccountHeader, AccountSettingsSidebar, PrivateSourcesSidebar } from '..';
import { FlashMessages } from '../../../../shared/flash_messages';
import { HttpLogic } from '../../../../shared/http';
import { SetWorkplaceSearchChrome } from '../../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../../shared/kibana_chrome/generate_breadcrumbs';
import { Loading } from '../../../../shared/loading';

import { PRIVATE_SOURCES_PATH, PERSONAL_SETTINGS_PATH } from '../../../routes';
import { PERSONAL_DASHBOARD_READ_ONLY_MODE_WARNING } from '../../../views/content_sources/constants';

import './personal_dashboard_layout.scss';

interface LayoutProps {
  isLoading?: boolean;
  pageChrome?: BreadcrumbTrail;
}

export const PersonalDashboardLayout: FC<PropsWithChildren<LayoutProps>> = ({
  children,
  isLoading,
  pageChrome,
}) => {
  const { readOnlyMode } = useValues(HttpLogic);

  return (
    <>
      {pageChrome && <SetWorkplaceSearchChrome trail={pageChrome} />}
      <AccountHeader />
      <EuiPageTemplate className="personalDashboardLayout" paddingSize="none" panelled>
        <EuiPageTemplate.Sidebar
          role="navigation"
          className="personalDashboardLayout__sideBar"
          sticky
          minWidth="480px"
        >
          {useRouteMatch(PRIVATE_SOURCES_PATH) && <PrivateSourcesSidebar />}
          {useRouteMatch(PERSONAL_SETTINGS_PATH) && <AccountSettingsSidebar />}
        </EuiPageTemplate.Sidebar>
        <EuiPageTemplate.Section
          className="personalDashboardLayout__body"
          paddingSize="none"
          restrictWidth
        >
          {readOnlyMode && (
            <>
              <EuiCallOut
                color="warning"
                iconType="lock"
                title={PERSONAL_DASHBOARD_READ_ONLY_MODE_WARNING}
              />
              <EuiSpacer />
            </>
          )}
          <FlashMessages />

          {isLoading ? <Loading /> : children}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
