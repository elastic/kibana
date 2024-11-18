/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { MaintenanceWindow } from '@kbn/alerting-plugin/common';
import { QueryOptionsOverrides } from '@kbn/alerts-ui-shared/src/common/types/tanstack_query_utility_types';
import { useKibana } from '../../../../common/lib/kibana';
import { ServerError } from '../types';
import { useLicense } from '../../../hooks/use_license';
import { triggersActionsUiQueriesKeys } from '../../../hooks/constants';
import {
  bulkGetMaintenanceWindows,
  BulkGetMaintenanceWindowsResult,
} from './apis/bulk_get_maintenance_windows';

const ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.api.bulkGetMaintenanceWindow.errorTitle',
  {
    defaultMessage: 'Error fetching maintenance windows data',
  }
);

const transformMaintenanceWindows = (
  data: BulkGetMaintenanceWindowsResult
): Map<string, MaintenanceWindow> => {
  const maintenanceWindowsMap = new Map();

  for (const maintenanceWindow of data?.maintenanceWindows ?? []) {
    maintenanceWindowsMap.set(maintenanceWindow.id, { ...maintenanceWindow });
  }

  return maintenanceWindowsMap;
};

interface UseBulkGetMaintenanceWindowsQueryParams {
  ids: string[];
}

export const useBulkGetMaintenanceWindowsQuery = (
  { ids }: UseBulkGetMaintenanceWindowsQueryParams,
  {
    enabled,
    context,
  }: Pick<QueryOptionsOverrides<typeof bulkGetMaintenanceWindows>, 'enabled' | 'context'> = {}
) => {
  const {
    http,
    notifications: { toasts },
    application: {
      capabilities: {
        maintenanceWindow: { show },
      },
    },
  } = useKibana().services;

  const { isAtLeastPlatinum } = useLicense();
  const hasLicense = isAtLeastPlatinum();

  return useQuery({
    queryKey: triggersActionsUiQueriesKeys.maintenanceWindowsBulkGet(ids),
    queryFn: () => bulkGetMaintenanceWindows({ http, ids }),
    select: transformMaintenanceWindows,
    onError: (error) => {
      const serverError = error as ServerError;
      toasts.addError(
        serverError.body && serverError.body.message
          ? new Error(serverError.body.message)
          : serverError,
        {
          title: ERROR_TITLE,
        }
      );
    },
    enabled: hasLicense && show && ids.length > 0 && enabled !== false,
    context,
  });
};
