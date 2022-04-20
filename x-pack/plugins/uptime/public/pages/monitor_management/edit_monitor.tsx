/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useTrackPageview, FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import { MonitorFields } from '../../../common/runtime_types';
import { EditMonitorConfig } from '../../components/monitor_management/edit_monitor_config';
import { Loader } from '../../components/monitor_management/loader/loader';
import { getMonitor } from '../../state/api';
import { DecryptedSyntheticsMonitorSavedObject } from '../../../common/types';
import { useLocations } from '../../components/monitor_management/hooks/use_locations';
import { useMonitorManagementBreadcrumbs } from './use_monitor_management_breadcrumbs';
import {
  LOADING_LABEL,
  ERROR_HEADING_LABEL,
  MONITOR_LOADING_ERROR_LABEL,
  SERVICE_LOCATIONS_ERROR_LABEL,
} from './content';

export const EditMonitorPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'edit-monitor' });
  useTrackPageview({ app: 'uptime', path: 'edit-monitor', delay: 15000 });
  useMonitorManagementBreadcrumbs({ isEditMonitor: true });
  const { monitorId } = useParams<{ monitorId: string }>();

  const { data, status } = useFetcher<
    Promise<DecryptedSyntheticsMonitorSavedObject | undefined>
  >(() => {
    return getMonitor({ id: Buffer.from(monitorId, 'base64').toString('utf8') });
  }, [monitorId]);

  const monitor = data?.attributes as MonitorFields;
  const { error: locationsError, loading: locationsLoading, throttling } = useLocations();

  return (
    <Loader
      loading={status === FETCH_STATUS.LOADING || locationsLoading}
      loadingTitle={LOADING_LABEL}
      error={status === FETCH_STATUS.FAILURE || Boolean(locationsError)}
      errorTitle={ERROR_HEADING_LABEL}
      errorBody={locationsError ? SERVICE_LOCATIONS_ERROR_LABEL : MONITOR_LOADING_ERROR_LABEL}
    >
      {monitor && <EditMonitorConfig monitor={monitor} throttling={throttling} />}
    </Loader>
  );
};
