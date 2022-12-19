/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBasicTableColumn, EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { TagsBadges } from '../../../common/components/tag_badges';
import { MonitorDetailsLink } from './monitor_details_link';

import {
  ConfigKey,
  DataStream,
  EncryptedSyntheticsSavedMonitor,
  OverviewStatusState,
  Ping,
  ServiceLocations,
  SourceType,
  SyntheticsMonitorSchedule,
} from '../../../../../../../common/runtime_types';

import { getFrequencyLabel } from './labels';
import { Actions } from './actions';
import { MonitorEnabled } from './monitor_enabled';
import { MonitorLocations } from './monitor_locations';

export function useMonitorListColumns({
  basePath,
  euiTheme,
  canEditSynthetics,
  reloadPage,
  loading,
  status,
}: {
  basePath: string;
  euiTheme: EuiThemeComputed;
  errorSummaries?: Ping[];
  errorSummariesById: Map<string, Ping>;
  canEditSynthetics: boolean;
  syntheticsMonitors: EncryptedSyntheticsSavedMonitor[];
  loading: boolean;
  status: OverviewStatusState | null;
  reloadPage: () => void;
}) {
  const history = useHistory();

  return [
    {
      align: 'left' as const,
      field: ConfigKey.NAME as string,
      name: i18n.translate('xpack.synthetics.management.monitorList.monitorName', {
        defaultMessage: 'Monitor',
      }),
      sortable: true,
      render: (_: string, monitor: EncryptedSyntheticsSavedMonitor) => (
        <MonitorDetailsLink basePath={basePath} monitor={monitor} />
      ),
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
      field: ConfigKey.SCHEDULE,
      sortable: true,
      name: i18n.translate('xpack.synthetics.management.monitorList.frequency', {
        defaultMessage: 'Frequency',
      }),
      render: (schedule: SyntheticsMonitorSchedule) => getFrequencyLabel(schedule),
    },
    {
      align: 'left' as const,
      field: ConfigKey.LOCATIONS,
      name: i18n.translate('xpack.synthetics.management.monitorList.locations', {
        defaultMessage: 'Locations',
      }),
      render: (locations: ServiceLocations, monitor: EncryptedSyntheticsSavedMonitor) =>
        locations ? (
          <MonitorLocations
            monitorId={monitor[ConfigKey.CONFIG_ID] ?? monitor.id}
            locations={locations}
            status={status}
          />
        ) : null,
    },
    {
      align: 'left' as const,
      field: ConfigKey.TAGS,
      name: i18n.translate('xpack.synthetics.management.monitorList.tags', {
        defaultMessage: 'Tags',
      }),
      render: (tags: string[]) => (
        <TagsBadges
          tags={tags}
          onClick={(tag) => {
            history.push({ search: `tags=${JSON.stringify([tag])}` });
          }}
        />
      ),
    },
    {
      align: 'left' as const,
      field: ConfigKey.ENABLED as string,
      sortable: true,
      name: i18n.translate('xpack.synthetics.management.monitorList.enabled', {
        defaultMessage: 'Enabled',
      }),
      render: (_enabled: boolean, monitor: EncryptedSyntheticsSavedMonitor) => (
        <MonitorEnabled
          configId={monitor[ConfigKey.CONFIG_ID]}
          monitor={monitor}
          reloadPage={reloadPage}
          isSwitchable={!loading}
        />
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
          configId={fields[ConfigKey.CONFIG_ID]}
          name={fields[ConfigKey.NAME]}
          canEditSynthetics={canEditSynthetics}
          reloadPage={reloadPage}
          isProjectMonitor={fields[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT}
        />
      ),
    },
  ] as Array<EuiBasicTableColumn<EncryptedSyntheticsSavedMonitor>>;
}
