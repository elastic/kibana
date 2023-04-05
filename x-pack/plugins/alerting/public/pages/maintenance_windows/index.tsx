/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPageHeader } from '@elastic/eui';
import { useKibana } from '../../utils/kibana_react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { EmptyPrompt } from './components/empty_prompt';
import * as i18n from './translations';
import { useCreateMaintenanceWindowNavigation } from '../../hooks/use_navigation';
import { AlertingDeepLinkId } from '../../config';

export const MaintenanceWindowsPage = React.memo(() => {
  const { docLinks } = useKibana().services;
  const { navigateToCreateMaintenanceWindow } = useCreateMaintenanceWindowNavigation();

  const { isLoading, maintenanceWindowsList } = {
    isLoading: false,
    maintenanceWindowsList: { total: 0 },
  };
  const { total } = maintenanceWindowsList || {};

  useBreadcrumbs(AlertingDeepLinkId.maintenanceWindows);

  const handleClickCreate = useCallback(() => {
    navigateToCreateMaintenanceWindow();
  }, [navigateToCreateMaintenanceWindow]);

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={i18n.MAINTENANCE_WINDOWS}
        description={i18n.MAINTENANCE_WINDOWS_DESCRIPTION}
      />

      {!isLoading && total === 0 ? (
        <EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks.links} />
      ) : null}
    </>
  );
});
MaintenanceWindowsPage.displayName = 'MaintenanceWindowsPage';
// eslint-disable-next-line import/no-default-export
export { MaintenanceWindowsPage as default };
