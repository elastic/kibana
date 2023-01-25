/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { FETCH_STATUS } from '@kbn/observability-plugin/public';
import {
  isStatusEnabled,
  toggleStatusAlert,
} from '../../../../../../../common/runtime_types/monitor_management/alert_config';
import { TagsBadges } from '../../../common/components/tag_badges';
import { useMonitorAlertEnable } from '../../../../hooks/use_monitor_alert_enable';
import * as labels from './labels';
import { MonitorDetailsLink } from './monitor_details_link';

import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
  OverviewStatusState,
  ServiceLocations,
  SyntheticsMonitorSchedule,
} from '../../../../../../../common/runtime_types';

import { MonitorTypeBadge } from '../../../common/components/monitor_type_badge';
import { getFrequencyLabel } from './labels';
import { MonitorEnabled } from './monitor_enabled';
import { MonitorLocations } from './monitor_locations';

export function useMonitorListColumns({
  canEditSynthetics,
  reloadPage,
  loading,
  status,
  setMonitorPendingDeletion,
}: {
  canEditSynthetics: boolean;
  loading: boolean;
  status: OverviewStatusState | null;
  reloadPage: () => void;
  setMonitorPendingDeletion: (config: EncryptedSyntheticsSavedMonitor) => void;
}): Array<EuiBasicTableColumn<EncryptedSyntheticsSavedMonitor>> {
  const history = useHistory();

  const { alertStatus, updateAlertEnabledState } = useMonitorAlertEnable();

  const isActionLoading = (fields: EncryptedSyntheticsSavedMonitor) => {
    return alertStatus(fields[ConfigKey.CONFIG_ID]) === FETCH_STATUS.LOADING;
  };

  return [
    {
      align: 'left' as const,
      field: ConfigKey.NAME as string,
      name: i18n.translate('xpack.synthetics.management.monitorList.monitorName', {
        defaultMessage: 'Monitor',
      }),
      sortable: true,
      render: (_: string, monitor: EncryptedSyntheticsSavedMonitor) => (
        <MonitorDetailsLink monitor={monitor} />
      ),
    },
    // Only show Project ID column if project monitors are present
    ...(status?.projectMonitorsCount ?? 0 > 0
      ? [
          {
            align: 'left' as const,
            field: ConfigKey.PROJECT_ID as string,
            name: i18n.translate('xpack.synthetics.management.monitorList.projectId', {
              defaultMessage: 'Project ID',
            }),
            sortable: true,
          },
        ]
      : []),
    {
      align: 'left' as const,
      field: ConfigKey.MONITOR_TYPE,
      name: i18n.translate('xpack.synthetics.management.monitorList.monitorType', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      render: (_: string, monitor: EncryptedSyntheticsSavedMonitor) => (
        <MonitorTypeBadge
          monitor={monitor}
          ariaLabel={labels.getFilterForTypeMessage(monitor[ConfigKey.MONITOR_TYPE])}
          onClick={() => {
            history.push({
              search: `monitorTypes=${encodeURIComponent(
                JSON.stringify([monitor[ConfigKey.MONITOR_TYPE]])
              )}`,
            });
          }}
        />
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
            history.push({ search: `tags=${encodeURIComponent(JSON.stringify([tag]))}` });
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
      actions: [
        {
          'data-test-subj': 'syntheticsMonitorEditAction',
          isPrimary: true,
          name: labels.EDIT_LABEL,
          description: labels.EDIT_LABEL,
          icon: 'pencil',
          type: 'icon',
          enabled: (fields) => canEditSynthetics && !isActionLoading(fields),
          onClick: (fields) => {
            history.push({
              pathname: `/edit-monitor/${fields[ConfigKey.CONFIG_ID]}`,
            });
          },
        },
        {
          'data-test-subj': 'syntheticsMonitorDeleteAction',
          isPrimary: true,
          name: labels.DELETE_LABEL,
          description: labels.DELETE_LABEL,
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          enabled: (fields) => canEditSynthetics && !isActionLoading(fields),
          onClick: (fields) => {
            setMonitorPendingDeletion(fields);
          },
        },
        {
          description: labels.DISABLE_STATUS_ALERT,
          name: (fields) =>
            isStatusEnabled(fields[ConfigKey.ALERT_CONFIG])
              ? labels.DISABLE_STATUS_ALERT
              : labels.ENABLE_STATUS_ALERT,
          icon: (fields) =>
            isStatusEnabled(fields[ConfigKey.ALERT_CONFIG]) ? 'bellSlash' : 'bell',
          type: 'icon',
          color: 'danger',
          enabled: (fields) => canEditSynthetics && !isActionLoading(fields),
          onClick: (fields) => {
            updateAlertEnabledState({
              monitor: {
                [ConfigKey.ALERT_CONFIG]: toggleStatusAlert(fields[ConfigKey.ALERT_CONFIG]),
              },
              name: fields[ConfigKey.NAME],
              configId: fields[ConfigKey.CONFIG_ID],
            });
          },
        },
        /*
      TODO: Implement duplication functionality
      const duplicateMenuItem = (
        <EuiContextMenuItem key="xpack.synthetics.duplicateMonitor" icon="copy" onClick={closePopover}>
          {labels.DUPLICATE_LABEL}
        </EuiContextMenuItem>
      );
      */
      ],
    },
  ];
}
