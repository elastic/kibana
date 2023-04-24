/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '../../utils/kibana_react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { EmptyPrompt } from './components/empty_prompt';
import * as i18n from './translations';
import { useCreateMaintenanceWindowNavigation } from '../../hooks/use_navigation';
import { AlertingDeepLinkId } from '../../config';
import { MaintenanceWindowsList } from './components/maintenance_windows_list';
import { useFindMaintenanceWindows } from '../../hooks/use_find_maintenance_windows';
import { CenterJustifiedSpinner } from './components/center_justified_spinner';
import { ExperimentalBadge } from './components/page_header';
import { useLicense } from '../../hooks/use_license';
import { LicensePrompt } from './components/license_prompt';

export const MaintenanceWindowsPage = React.memo(() => {
  const { docLinks } = useKibana().services;
  const { isAtLeastPlatinum } = useLicense();

  const { navigateToCreateMaintenanceWindow } = useCreateMaintenanceWindowNavigation();

  const { isLoading, maintenanceWindows, refetch } = useFindMaintenanceWindows();

  useBreadcrumbs(AlertingDeepLinkId.maintenanceWindows);

  const handleClickCreate = useCallback(() => {
    navigateToCreateMaintenanceWindow();
  }, [navigateToCreateMaintenanceWindow]);

  const refreshData = useCallback(() => refetch(), [refetch]);

  const showEmptyPrompt = !isLoading && maintenanceWindows.length === 0;
  const hasLicense = isAtLeastPlatinum();

  if (isLoading) {
    return <CenterJustifiedSpinner />;
  }

  return (
    <>
      <EuiPageHeader bottomBorder alignItems="top">
        <EuiPageHeaderSection>
          <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>{i18n.MAINTENANCE_WINDOWS}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ExperimentalBadge />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiText size="m">
            <p>{i18n.MAINTENANCE_WINDOWS_DESCRIPTION}</p>
          </EuiText>
        </EuiPageHeaderSection>
        {!showEmptyPrompt && hasLicense ? (
          <EuiPageHeaderSection>
            <EuiButton onClick={handleClickCreate} iconType="plusInCircle" fill>
              {i18n.CREATE_NEW_BUTTON}
            </EuiButton>
          </EuiPageHeaderSection>
        ) : null}
      </EuiPageHeader>
      {!hasLicense ? (
        <LicensePrompt />
      ) : showEmptyPrompt ? (
        <EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks.links} />
      ) : (
        <>
          <EuiSpacer size="xl" />
          <MaintenanceWindowsList
            refreshData={refreshData}
            loading={isLoading}
            items={maintenanceWindows}
          />
        </>
      )}
    </>
  );
});
MaintenanceWindowsPage.displayName = 'MaintenanceWindowsPage';
// eslint-disable-next-line import/no-default-export
export { MaintenanceWindowsPage as default };
