/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import React, { useCallback, useEffect } from 'react';
import { MAINTENANCE_WINDOW_DEEP_LINK_IDS, MAINTENANCE_WINDOW_FEATURE_ID } from '../../../common';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFindMaintenanceWindows } from '../../hooks/use_find_maintenance_windows';
import { useLicense } from '../../hooks/use_license';
import { useCreateMaintenanceWindowNavigation } from '../../hooks/use_navigation';
import { useKibana } from '../../utils/kibana_react';
import { CenterJustifiedSpinner } from './components/center_justified_spinner';
import { EmptyPrompt } from './components/empty_prompt';
import { LicensePrompt } from './components/license_prompt';
import { MaintenanceWindowsList } from './components/maintenance_windows_list';
import { ExperimentalBadge } from './components/page_header';
import * as i18n from './translations';

export const MaintenanceWindowsPage = React.memo(() => {
  const {
    application: { capabilities },
    chrome,
    docLinks,
  } = useKibana().services;
  const { isAtLeastPlatinum } = useLicense();
  const hasLicense = isAtLeastPlatinum();

  const { navigateToCreateMaintenanceWindow } = useCreateMaintenanceWindowNavigation();

  const { isLoading, maintenanceWindows, refetch } = useFindMaintenanceWindows({
    enabled: hasLicense,
  });

  useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows);

  const handleClickCreate = useCallback(() => {
    navigateToCreateMaintenanceWindow();
  }, [navigateToCreateMaintenanceWindow]);

  const refreshData = useCallback(() => refetch(), [refetch]);
  const showWindowMaintenance = capabilities[MAINTENANCE_WINDOW_FEATURE_ID].show;
  const writeWindowMaintenance = capabilities[MAINTENANCE_WINDOW_FEATURE_ID].save;
  const showEmptyPrompt =
    !isLoading &&
    maintenanceWindows.length === 0 &&
    showWindowMaintenance &&
    writeWindowMaintenance;

  const readOnly = showWindowMaintenance && !writeWindowMaintenance;

  // if the user is read only then display the glasses badge in the global navigation header
  const setBadge = useCallback(() => {
    if (readOnly) {
      chrome.setBadge({
        text: i18n.READ_ONLY_BADGE_TEXT,
        tooltip: i18n.READ_ONLY_BADGE_TOOLTIP,
        iconType: 'glasses',
      });
    }
  }, [chrome, readOnly]);

  useEffect(() => {
    setBadge();

    // remove the icon after the component unmounts
    return () => {
      chrome.setBadge();
    };
  }, [setBadge, chrome]);

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
        {!showEmptyPrompt && hasLicense && writeWindowMaintenance ? (
          <EuiPageHeaderSection>
            <EuiButton
              data-test-subj="mw-create-button"
              onClick={handleClickCreate}
              iconType="plusInCircle"
              fill
            >
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
            readOnly={readOnly}
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
