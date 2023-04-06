/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../utils/kibana_react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { EmptyPrompt } from './components/empty_prompt';
import * as i18n from './translations';
import { useCreateMaintenanceWindowNavigation } from '../../hooks/use_navigation';
import { AlertingDeepLinkId } from '../../config';
import { MaintenanceWindowsList } from './components/maintenance_windows_list';
import { useGetMaintenanceWindowsList } from '../../hooks/use_get_maintenance_windows_list';
import { CenterJustifiedSpinner } from './components/center_justified_spinner';

export const MaintenanceWindowsPage = React.memo(() => {
  const { docLinks } = useKibana().services;
  const { navigateToCreateMaintenanceWindow } = useCreateMaintenanceWindowNavigation();

  const { isInitialLoading, isLoading, maintenanceWindows } = useGetMaintenanceWindowsList();

  useBreadcrumbs(AlertingDeepLinkId.maintenanceWindows);

  const handleClickCreate = useCallback(() => {
    navigateToCreateMaintenanceWindow();
  }, [navigateToCreateMaintenanceWindow]);

  const showEmptyPrompt = !isLoading && maintenanceWindows.length === 0;

  if (isInitialLoading) {
    return <CenterJustifiedSpinner />;
  }

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={i18n.MAINTENANCE_WINDOWS}
        description={i18n.MAINTENANCE_WINDOWS_DESCRIPTION}
        rightSideItems={
          !showEmptyPrompt
            ? [
                <EuiButton onClick={handleClickCreate} iconType="plusInCircle" fill>
                  {i18n.CREATE_NEW_BUTTON}
                </EuiButton>,
              ]
            : []
        }
      />
      {showEmptyPrompt ? (
        <EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks.links} />
      ) : (
        <>
          <EuiSpacer size="xl" />
          <MaintenanceWindowsList loading={isLoading} items={maintenanceWindows} />
        </>
      )}
    </>
  );
});
MaintenanceWindowsPage.displayName = 'MaintenanceWindowsPage';
// eslint-disable-next-line import/no-default-export
export { MaintenanceWindowsPage as default };
