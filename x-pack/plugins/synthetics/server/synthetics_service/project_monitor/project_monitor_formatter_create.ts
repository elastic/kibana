/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { syncNewMonitorBulk } from '../../routes/monitor_cruds/bulk_cruds/add_monitor_bulk';
import { SyntheticsMonitorClient } from '../synthetics_monitor/synthetics_monitor_client';
import {
  ConfigKey,
  ProjectMonitor,
  SyntheticsMonitor,
  MonitorFields,
} from '../../../common/runtime_types';
import { ProjectMonitorFormatter, ProjectMonitorFormatterProps } from './project_monitor_formatter';

export const FAILED_TO_CREATE_MONITOR = i18n.translate(
  'xpack.synthetics.service.projectMonitors.failedToCreateMonitor',
  {
    defaultMessage: 'Failed to create monitor.',
  }
);

export const FAILED_TO_CREATE_MONITORS = i18n.translate(
  'xpack.synthetics.service.projectMonitors.failedToCreateMonitors',
  {
    defaultMessage: 'Failed to create monitors.',
  }
);

export type ProjectMonitorFormatterCreateProps = ProjectMonitorFormatterProps & {
  monitors: ProjectMonitor[];
  syntheticsMonitorClient: SyntheticsMonitorClient;
};

export class ProjectMonitorFormatterCreate extends ProjectMonitorFormatter {
  public createdMonitors: string[] = [];
  private monitors: ProjectMonitor[] = [];
  private syntheticsMonitorClient: SyntheticsMonitorClient;

  constructor(props: ProjectMonitorFormatterCreateProps) {
    const { syntheticsMonitorClient, monitors, ...rest } = props;
    super(rest);
    this.syntheticsMonitorClient = syntheticsMonitorClient;
    this.monitors = monitors;
  }

  public configureAllProjectMonitors = async () => {
    const existingMonitors = await this.getProjectMonitorsForProject();

    const normalizedNewMonitors: SyntheticsMonitor[] = [];

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
          this.failedMonitors.push({
            reason: FAILED_TO_CREATE_MONITOR,
            details: i18n.translate(
              'xpack.synthetics.service.projectMonitors.monitorAlreadyExists',
              {
                defaultMessage:
                  'Monitor {monitorId} already exists. Please send PUT request to update.',
                values: {
                  monitorId: monitor.id,
                },
              }
            ),
            payload: monitor,
          });
        } else {
          normalizedNewMonitors.push(normM as MonitorFields);
        }
      }
    }

    await this.createMonitorsBulk(normalizedNewMonitors);
  };

  private createMonitorsBulk = async (monitors: SyntheticsMonitor[]) => {
    try {
      if (monitors.length > 0) {
        const { newMonitors } = await syncNewMonitorBulk({
          normalizedMonitors: monitors,
          server: this.server,
          syntheticsMonitorClient: this.syntheticsMonitorClient,
          soClient: this.savedObjectsClient,
          request: this.request,
          privateLocations: this.privateLocations,
          spaceId: this.spaceId,
        });

        if (newMonitors && newMonitors.length === monitors.length) {
          this.createdMonitors.push(...monitors.map((monitor) => monitor[ConfigKey.JOURNEY_ID]!));
        } else {
          this.failedMonitors.push({
            reason: i18n.translate(
              'xpack.synthetics.service.projectMonitors.failedToCreateXMonitors',
              {
                defaultMessage: 'Failed to create {length} monitors.',
                values: {
                  length: monitors.length,
                },
              }
            ),
            details: FAILED_TO_CREATE_MONITORS,
            payload: monitors,
          });
        }
      }
    } catch (e) {
      this.server.logger.error(e);
      this.failedMonitors.push({
        reason: i18n.translate('xpack.synthetics.service.projectMonitors.failedToCreateXMonitors', {
          defaultMessage: 'Failed to create {length} monitors.',
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
