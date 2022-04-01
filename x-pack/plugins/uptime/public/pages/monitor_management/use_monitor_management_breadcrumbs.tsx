/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { MONITOR_MANAGEMENT_ROUTE } from '../../../common/constants';
import { PLUGIN } from '../../../common/constants/plugin';

export const useMonitorManagementBreadcrumbs = ({
  isAddMonitor,
  isEditMonitor,
  monitorId,
}: {
  isAddMonitor?: boolean;
  isEditMonitor?: boolean;
  monitorId?: string;
} = {}) => {
  const kibana = useKibana();
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.ID) ?? '';

  useBreadcrumbs([
    {
      text: MONITOR_MANAGEMENT_CRUMB,
      href:
        isAddMonitor || isEditMonitor ? `${appPath}/${MONITOR_MANAGEMENT_ROUTE}/all` : undefined,
    },
    ...(isAddMonitor
      ? [
          {
            text: ADD_MONITOR_CRUMB,
          },
        ]
      : []),
    ...(isEditMonitor
      ? [
          {
            text: EDIT_MONITOR_CRUMB,
          },
        ]
      : []),
  ]);
};

export const MONITOR_MANAGEMENT_CRUMB = i18n.translate(
  'xpack.uptime.monitorManagement.manageMonitorsCrumb',
  {
    defaultMessage: 'Manage monitors',
  }
);

export const ADD_MONITOR_CRUMB = i18n.translate('xpack.uptime.monitorManagement.addMonitorCrumb', {
  defaultMessage: 'Add monitor',
});

export const EDIT_MONITOR_CRUMB = i18n.translate(
  'xpack.uptime.monitorManagement.editMonitorCrumb',
  {
    defaultMessage: 'Edit monitor',
  }
);
