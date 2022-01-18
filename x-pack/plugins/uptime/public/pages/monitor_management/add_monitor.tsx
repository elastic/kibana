/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useTrackPageview } from '../../../../observability/public';
import { ScheduleUnit } from '../../../common/runtime_types';
import { SyntheticsProviders } from '../../components/fleet_package/contexts';
import { Loader } from '../../components/monitor_management/loader/loader';
import { MonitorConfig } from '../../components/monitor_management/monitor_config/monitor_config';
import { useLocations } from '../../components/monitor_management/hooks/use_locations';

export const AddMonitorPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'add-monitor' });
  useTrackPageview({ app: 'uptime', path: 'add-monitor', delay: 15000 });

  const { error, loading } = useLocations();

  return (
    <Loader
      error={Boolean(error)}
      loading={loading}
      loadingTitle={LOADING_LABEL}
      errorTitle={ERROR_HEADING_LABEL}
      errorBody={ERROR_BODY_LABEL}
    >
      <SyntheticsProviders
        policyDefaultValues={{
          isZipUrlSourceEnabled: false,
          allowedScheduleUnits: [ScheduleUnit.MINUTES],
        }}
      >
        <MonitorConfig />
      </SyntheticsProviders>
    </Loader>
  );
};

const LOADING_LABEL = i18n.translate('xpack.uptime.monitorManagement.addMonitorLoadingLabel', {
  defaultMessage: 'Loading Monitor Management',
});

const ERROR_HEADING_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.addMonitorLoadingError',
  {
    defaultMessage: 'Error loading monitor management',
  }
);

const ERROR_BODY_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.addMonitorServiceLocationsLoadingError',
  {
    defaultMessage: 'Service locations were not able to be loaded. Please try again later.',
  }
);
