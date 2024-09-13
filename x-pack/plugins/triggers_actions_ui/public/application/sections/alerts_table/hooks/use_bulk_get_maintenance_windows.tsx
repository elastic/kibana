/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { QueryClientProviderProps, useQuery } from '@tanstack/react-query';
import { MaintenanceWindow } from '@kbn/alerting-plugin/common';
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

interface UseBulkGetMaintenanceWindowsProps {
  ids: string[];
  canFetchMaintenanceWindows?: boolean;
  queryContext?: QueryClientProviderProps['context'];
}

export const useBulkGetMaintenanceWindows = (props: UseBulkGetMaintenanceWindowsProps) => {
  const { ids, canFetchMaintenanceWindows = false, queryContext } = props;

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

  const queryFn = () => {
    return bulkGetMaintenanceWindows({ http, ids });
  };

  const onError = (error: ServerError) => {
    toasts.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: ERROR_TITLE,
    });
  };

  const { data, isFetching } = useQuery({
    queryKey: triggersActionsUiQueriesKeys.maintenanceWindowsBulkGet(ids),
    enabled: hasLicense && show && ids.length > 0 && canFetchMaintenanceWindows,
    select: transformMaintenanceWindows,
    queryFn,
    onError,
    context: queryContext,
  });

  return {
    data,
    isFetching,
  };
};
