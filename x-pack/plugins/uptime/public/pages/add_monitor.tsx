/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '../../../observability/public';
import { SyntheticsProviders } from '../components/fleet_package/contexts';
import { getServiceLocations } from '../state/actions';
import { Loader } from '../components/monitor_management/loader/loader';
import { MonitorConfig } from '../components/monitor_management/monitor_config/monitor_config';
import { monitorManagementListSelector } from '../state/selectors';

export const AddMonitorPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'add-monitor' });
  useTrackPageview({ app: 'uptime', path: 'add-monitor', delay: 15000 });

  const dispatch = useDispatch();
  const {
    error: { serviceLocations: serviceLocationsError },
    loading: { serviceLocations: serviceLocationsLoading },
  } = useSelector(monitorManagementListSelector);

  useEffect(() => {
    dispatch(getServiceLocations());
  }, [dispatch]);

  return (
    <Loader
      error={Boolean(serviceLocationsError)}
      loading={serviceLocationsLoading}
      loadingTitle={LOADING_LABEL}
      errorTitle={ERROR_HEADING_LABEL}
      errorBody={ERROR_BODY_LABEL}
    >
      <SyntheticsProviders>
        <MonitorConfig />
      </SyntheticsProviders>
    </Loader>
  );
};

const LOADING_LABEL = i18n.translate('xpack.uptime.monitorManagement.addMonitorLoadingLabel', {
  defaultMessage: 'Loading Monitor Management',
});

const ERROR_HEADING_LABEL = i18n.translate('xpack.uptime.monitorManagement.addMonitorError', {
  defaultMessage: 'Error loading monitor management',
});

const ERROR_BODY_LABEL = i18n.translate('xpack.uptime.monitorManagement.addMonitorError', {
  defaultMessage: 'Service locations were not able to be loaded. Please try again later.',
});
