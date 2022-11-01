/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsFindResult } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { SyntheticsMonitorClient } from '../synthetics_monitor/synthetics_monitor_client';
import { syncEditedMonitorBulk } from '../../routes/monitor_cruds/bulk_cruds/edit_monitor_bulk';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  ProjectMonitor,
  SyntheticsMonitor,
  MonitorFields,
} from '../../../common/runtime_types';
import { formatSecrets, normalizeSecrets } from '../utils/secrets';

import { ProjectMonitorFormatter, ProjectMonitorFormatterProps } from './project_monitor_formatter';

export const FAILED_TO_UPDATE_MONITOR = i18n.translate(
  'xpack.synthetics.service.projectMonitors.failedToUpdateMonitor',
  {
    defaultMessage: 'Failed to update monitor.',
  }
);

export const FAILED_TO_UPDATE_MONITORS = i18n.translate(
  'xpack.synthetics.service.projectMonitors.failedToUpdateMonitors',
  {
    defaultMessage: 'Failed to update monitors.',
  }
);

export type ProjectMonitorFormatterUpdateProps = ProjectMonitorFormatterProps & {
  monitors: ProjectMonitor[];
  syntheticsMonitorClient: SyntheticsMonitorClient;
};

export class ProjectMonitorFormatterUpdate extends ProjectMonitorFormatter {
  public updatedMonitors: string[] = [];
  private monitors: ProjectMonitor[] = [];
  private syntheticsMonitorClient: SyntheticsMonitorClient;

  constructor(props: ProjectMonitorFormatterUpdateProps) {
    const { syntheticsMonitorClient, monitors, ...rest } = props;
    super(rest);
    this.syntheticsMonitorClient = syntheticsMonitorClient;
    this.monitors = monitors;
  }

  public configureAllProjectMonitors = async () => {
    const existingMonitors = await this.getProjectMonitorsForProject();

    const normalizedUpdateMonitors: Array<{
      previousMonitor: SavedObjectsFindResult<EncryptedSyntheticsMonitor>;
      monitor: SyntheticsMonitor;
    }> = [];

    for (const monitor of this.monitors) {
      const previousMonitor = existingMonitors.find(
        (monitorObj) =>
          (monitorObj.attributes as SyntheticsMonitor)[ConfigKey.JOURNEY_ID] === monitor.id
      );

      const normM = await this.validateProjectMonitor({
        monitor,
      });
      if (normM) {
        if (previousMonitor) {
          this.updatedMonitors.push(monitor.id);
          normalizedUpdateMonitors.push({ monitor: normM as MonitorFields, previousMonitor });
        } else {
          this.failedMonitors.push({
            reason: FAILED_TO_UPDATE_MONITOR,
            details: i18n.translate(
              'xpack.synthetics.service.projectMonitors.monitorDoesNotExists',
              {
                defaultMessage:
                  'Monitor {monitorId} does not exist. Please send POST request to create.',
                values: {
                  monitorId: monitor.id,
                },
              }
            ),
            payload: monitor,
          });
        }
      }
    }

    await this.updateMonitorsBulk(normalizedUpdateMonitors);
  };

  private updateMonitorsBulk = async (
    monitors: Array<{
      monitor: SyntheticsMonitor;
      previousMonitor: SavedObjectsFindResult<EncryptedSyntheticsMonitor>;
    }>
  ) => {
    try {
      const decryptedPreviousMonitors = await this.getDecryptedMonitors(
        monitors.map((m) => m.previousMonitor)
      );

      const monitorsToUpdate = [];

      for (let i = 0; i < decryptedPreviousMonitors.length; i++) {
        const decryptedPreviousMonitor = decryptedPreviousMonitors[i];
        const previousMonitor = monitors[i].previousMonitor;
        const normalizedMonitor = monitors[i].monitor;

        const {
          attributes: { [ConfigKey.REVISION]: _, ...normalizedPreviousMonitorAttributes },
        } = normalizeSecrets(decryptedPreviousMonitor);

        const monitorWithRevision = formatSecrets({
          ...normalizedPreviousMonitorAttributes,
          ...normalizedMonitor,
          revision: (previousMonitor.attributes[ConfigKey.REVISION] || 0) + 1,
        });
        monitorsToUpdate.push({
          normalizedMonitor,
          previousMonitor,
          monitorWithRevision,
          decryptedPreviousMonitor,
        });
      }

      await syncEditedMonitorBulk({
        monitorsToUpdate,
        server: this.server,
        syntheticsMonitorClient: this.syntheticsMonitorClient,
        savedObjectsClient: this.savedObjectsClient,
        request: this.request,
        privateLocations: this.privateLocations,
        spaceId: this.spaceId,
      });
    } catch (e) {
      this.server.logger.error(e);
      this.failedMonitors.push({
        reason: i18n.translate('xpack.synthetics.service.projectMonitors.failedToUpdateXMonitors', {
          defaultMessage: 'Failed to update {length} monitors.',
          values: {
            length: monitors.length,
          },
        }),
        details: e.message,
        payload: monitors,
      });
    }
  };
}
