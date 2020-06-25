/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertVersionMismatchState,
  AlertInstanceState,
  AlertVersions,
} from './types';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_ALERTS,
  ALERT_LOGSTASH_VERSION_MISMATCH,
  ALERT_ACTION_TYPE_EMAIL,
  ALERT_ACTION_TYPE_LOG,
  INDEX_PATTERN_LOGSTASH,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertSeverity } from '../../common/enums';
import { CommonAlertParams } from '../../common/types';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { fetchLogstashVersions } from '../lib/alerts/fetch_logstash_versions';

const WATCH_NAME = 'logstash_version_mismatch';
const RESOLVED = i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.resolved', {
  defaultMessage: 'resolved',
});
const FIRING = i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.firing', {
  defaultMessage: 'firing',
});

export class LogstashVersionMismatchAlert extends BaseAlert {
  public type = ALERT_LOGSTASH_VERSION_MISMATCH;
  public label = 'Logstash version mismatch';
  public isLegacy = true;

  protected actionVariables = [
    { name: 'state', description: 'The current state of the alert.' },
    { name: 'clusterName', description: 'The name of the cluster to which the nodes belong.' },
    { name: 'versionList', description: 'The list of unique versions.' },
  ];

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    const logger = this.getLogger(this.type);
    let alertIndexPattern = INDEX_ALERTS;
    if (availableCcs) {
      alertIndexPattern = getCcsIndexPattern(alertIndexPattern, availableCcs);
    }
    let logstashIndexPattern = INDEX_PATTERN_LOGSTASH;
    if (availableCcs) {
      logstashIndexPattern = getCcsIndexPattern(logstashIndexPattern, availableCcs);
    }
    const [logstashVersions, legacyAlerts] = await Promise.all([
      await fetchLogstashVersions(
        callCluster,
        clusters,
        logstashIndexPattern,
        this.config.ui.max_bucket_size
      ),
      await fetchLegacyAlerts(callCluster, clusters, alertIndexPattern, WATCH_NAME),
    ]);
    return legacyAlerts.reduce((accum: AlertData[], legacyAlert) => {
      const versions = logstashVersions.find(
        ({ clusterUuid }) => clusterUuid === legacyAlert.metadata.cluster_uuid
      );
      if (!versions) {
        // This is potentially bad
        logger.warn(
          `Unable to map legacy alert status to logstash version for ${legacyAlert.metadata.cluster_uuid}. No alert will show in the UI but it is assumed the alert has been resolved.`
        );
        return accum;
      }

      const shouldFire = versions.versions.length > 0;
      const severity = AlertSeverity.Warning;

      accum.push({
        instanceKey: `${versions.clusterUuid}`,
        clusterUuid: versions.clusterUuid,
        shouldFire,
        severity,
        meta: versions,
        ccs: versions.ccs,
      });
      return accum;
    }, []);
  }

  protected getDefaultAlertState(
    cluster: AlertCluster,
    item: AlertData
  ): AlertVersionMismatchState {
    const versions = item.meta as AlertVersions;
    return {
      cluster,
      ccs: null,
      versions,
      ui: {
        isFiring: false,
        message: null,
        severity: AlertSeverity.Success,
        resolvedMS: 0,
        triggeredMS: 0,
        lastCheckedMS: 0,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const versions = item.meta as AlertVersions;
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.ui.resolvedMessage', {
          defaultMessage: `All versions are the same for Logstash in this cluster.`,
        }),
      };
    }

    const text = i18n.translate(
      'xpack.monitoring.alerts.logstashVersionMismatch.ui.firingMessage',
      {
        defaultMessage: `There are different versions of Logstash ({versions}) running in this cluster.`,
        values: {
          versions: versions.versions.join(','),
        },
      }
    );

    return {
      text,
    };
  }

  protected async executeActions(
    instance: AlertInstance,
    instanceState: AlertInstanceState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    if (instanceState.alertStates.length === 0) {
      return;
    }
    const alertState = instanceState.alertStates[0];
    const versions = item.meta as AlertVersions;
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        state: RESOLVED,
        clusterName: cluster.clusterName,
      });
    } else {
      instance.scheduleActions('default', {
        state: FIRING,
        clusterName: cluster.clusterName,
        versionList: versions.versions.join(','),
      });
    }
  }

  public getDefaultActionParams(actionTypeId: string) {
    switch (actionTypeId) {
      case ALERT_ACTION_TYPE_EMAIL:
        return {
          subject: i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.emailSubject', {
            defaultMessage: `Logstash version mismatch alert is {state} for {clusterName}`,
            values: {
              state: '{{context.state}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
          message: i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.emailMessage', {
            defaultMessage: `Logstash is running {versionList} in {clusterName}.`,
            values: {
              versionList: '{{context.versionList}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
        };
      case ALERT_ACTION_TYPE_LOG:
        return {
          message: i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.serverLog', {
            defaultMessage: `Logstash version mismatch alert is {state} for {clusterName}`,
            values: {
              state: '{{context.state}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
        };
    }
    return null;
  }
}
