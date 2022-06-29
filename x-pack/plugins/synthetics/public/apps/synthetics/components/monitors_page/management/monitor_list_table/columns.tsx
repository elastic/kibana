/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBasicTableColumn, EuiIcon, EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import React from 'react';
import { MonitorDetailsLink } from './monitor_details_link';

import {
  ConfigKey,
  DataStream,
  EncryptedSyntheticsSavedMonitor,
  Ping,
  ServiceLocations,
  SyntheticsMonitorSchedule,
} from '../../../../../../../common/runtime_types';

import { getFrequencyLabel } from './labels';
import { Actions } from './actions';
import { MonitorEnabled } from './monitor_enabled';
import { MonitorLocations } from './monitor_locations';

export function getMonitorListColumns({
  basePath,
  euiTheme,
  errorSummaries,
  errorSummariesById,
  canEditSynthetics,
  reloadPage,
  syntheticsMonitors,
}: {
  basePath: string;
  euiTheme: EuiThemeComputed;
  errorSummaries?: Ping[];
  errorSummariesById: Map<string, Ping>;
  canEditSynthetics: boolean;
  syntheticsMonitors: EncryptedSyntheticsSavedMonitor[];
  reloadPage: () => void;
}) {
  const getIsMonitorUnHealthy = (monitor: EncryptedSyntheticsSavedMonitor) => {
    const errorSummary = errorSummariesById.get(monitor.id);

    if (errorSummary) {
      return moment(monitor.updated_at).isBefore(moment(errorSummary.timestamp));
    }

    return false;
  };

  return [
    {
      align: 'left' as const,
      field: ConfigKey.NAME as string,
      name: i18n.translate('xpack.synthetics.management.monitorList.monitorName', {
        defaultMessage: 'Monitor name',
      }),
      sortable: true,
      render: (_: string, monitor: EncryptedSyntheticsSavedMonitor) => (
        <MonitorDetailsLink basePath={basePath} monitor={monitor} />
      ),
    },
    {
      align: 'left' as const,
      field: 'id',
      name: i18n.translate('xpack.synthetics.management.monitorList.monitorStatus', {
        defaultMessage: 'Status',
      }),
      sortable: false,
      render: (_: string, monitor: EncryptedSyntheticsSavedMonitor) => {
        const isMonitorHealthy = !getIsMonitorUnHealthy(monitor);

        return (
          <>
            <EuiIcon
              type="dot"
              color={isMonitorHealthy ? euiTheme.colors.success : euiTheme.colors.danger}
            />
            {isMonitorHealthy ? (
              <FormattedMessage
                id="xpack.synthetics.management.monitorList.monitorHealthy"
                defaultMessage="Healthy"
              />
            ) : (
              <FormattedMessage
                id="xpack.synthetics.management.monitorList.monitorUnhealthy"
                defaultMessage="Unhealthy"
              />
            )}
          </>
        );
      },
    },
    {
      align: 'left' as const,
      field: ConfigKey.MONITOR_TYPE,
      name: i18n.translate('xpack.synthetics.management.monitorList.monitorType', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      render: (monitorType: DataStream) => (
        <EuiBadge>{monitorType === DataStream.BROWSER ? 'Browser' : 'Ping'}</EuiBadge>
      ),
    },
    {
      align: 'left' as const,
      field: ConfigKey.LOCATIONS,
      name: i18n.translate('xpack.synthetics.management.monitorList.locations', {
        defaultMessage: 'Locations',
      }),
      render: (locations: ServiceLocations) =>
        locations ? <MonitorLocations locations={locations} /> : null,
    },
    {
      align: 'left' as const,
      field: ConfigKey.SCHEDULE,
      sortable: true,
      name: i18n.translate('xpack.synthetics.management.monitorList.frequency', {
        defaultMessage: 'Frequency',
      }),
      render: (schedule: SyntheticsMonitorSchedule) => getFrequencyLabel(schedule),
    },
    {
      align: 'left' as const,
      field: ConfigKey.ENABLED as string,
      name: i18n.translate('xpack.synthetics.management.monitorList.enabled', {
        defaultMessage: 'Enabled',
      }),
      render: (_enabled: boolean, monitor: EncryptedSyntheticsSavedMonitor) => (
        <MonitorEnabled id={monitor.id} monitor={monitor} reloadPage={reloadPage} />
      ),
    },
    {
      align: 'right' as const,
      name: i18n.translate('xpack.synthetics.management.monitorList.actions', {
        defaultMessage: 'Actions',
      }),
      render: (fields: EncryptedSyntheticsSavedMonitor) => (
        <Actions
          euiTheme={euiTheme}
          id={fields.id}
          name={fields[ConfigKey.NAME]}
          canEditSynthetics={canEditSynthetics}
          reloadPage={reloadPage}
        />
      ),
    },
  ] as Array<EuiBasicTableColumn<EncryptedSyntheticsSavedMonitor>>;
}
