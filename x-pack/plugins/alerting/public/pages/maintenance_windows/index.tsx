/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import moment from 'moment';
import { EuiPageHeader } from '@elastic/eui';
import { useKibana } from '../../utils/kibana_react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { EmptyPrompt } from './components/empty_prompt';
import * as i18n from './translations';
import { useCreateMaintenanceWindowNavigation } from '../../hooks/use_navigation';
import { AlertingDeepLinkId } from '../../config';
import { MaintenanceWindowsTable } from './components/table';
import { MaintenanceWindowResponse } from './types';

export const MaintenanceWindowsPage = React.memo(() => {
  const { docLinks } = useKibana().services;
  const { navigateToCreateMaintenanceWindow } = useCreateMaintenanceWindowNavigation();

  const { isLoading, maintenanceWindowsList } = {
    isLoading: false,
    maintenanceWindowsList: { total: 0 },
  };
  const { total } = maintenanceWindowsList || {};
  const items: MaintenanceWindowResponse[] = [
    {
      id: '1',
      total: 1000,
      title: 'Host maintenance',
      enabled: true,
      duration: 1,
      expirationDate: moment('2023-04-05').toISOString(),
      events: [],
      rRule: { dtstart: moment('2023-04-04').toISOString(), tzid: 'UTC' },
      status: 'running',
      eventStartTime: moment('2023-04-04').toISOString(),
      eventEndTime: moment('2023-04-05').toISOString(),
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: moment('2023-04-04').toISOString(),
      updatedAt: moment('2023-04-04').toISOString(),
    },
    {
      id: '2',
      total: 1000,
      title: 'Server outage west coast',
      enabled: true,
      duration: 1,
      expirationDate: moment('2023-04-08').toISOString(),
      events: [],
      rRule: { dtstart: moment().toISOString(), tzid: 'UTC' },
      status: 'upcoming',
      eventStartTime: moment('2023-04-07').toISOString(),
      eventEndTime: moment('2023-04-08').toISOString(),
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: moment('2023-04-04').toISOString(),
      updatedAt: moment('2023-04-04').toISOString(),
    },
    {
      id: '3',
      total: 1000,
      title: 'Malware attack fix',
      enabled: true,
      duration: 1,
      expirationDate: moment('2023-04-10').toISOString(),
      events: [],
      rRule: { dtstart: moment('2023-04-09').toISOString(), tzid: 'UTC' },
      status: 'upcoming',
      eventStartTime: moment('2023-04-09').toISOString(),
      eventEndTime: moment('2023-04-10').toISOString(),
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: moment('2023-04-04').toISOString(),
      updatedAt: moment('2023-04-04').toISOString(),
    },
    {
      id: '4',
      total: 1000,
      title: 'Monthly maintenance window',
      enabled: true,
      duration: 1,
      expirationDate: moment('2023-04-04').toISOString(),
      events: [],
      rRule: { dtstart: moment('2023-04-03').toISOString(), tzid: 'UTC' },
      status: 'finished',
      eventStartTime: moment('2023-04-03').toISOString(),
      eventEndTime: moment('2023-04-04').toISOString(),
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: moment('2023-04-03').toISOString(),
      updatedAt: moment('2023-04-03').toISOString(),
    },
    {
      id: '5',
      total: 1000,
      title: 'Monthly maintenance window',
      enabled: true,
      duration: 1,
      expirationDate: moment('2023-04-01').toISOString(),
      events: [],
      rRule: { dtstart: moment('2023-04-01').toISOString(), tzid: 'UTC' },
      status: 'archived',
      eventStartTime: moment('2023-03-30').toISOString(),
      eventEndTime: moment().toISOString(),
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: moment('2023-03-30').toISOString(),
      updatedAt: moment('2023-03-30').toISOString(),
    },
  ];
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

      {!isLoading && total !== 0 ? (
        <EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks.links} />
      ) : (
        <MaintenanceWindowsTable loading={isLoading} items={items} />
      )}
    </>
  );
});
MaintenanceWindowsPage.displayName = 'MaintenanceWindowsPage';
