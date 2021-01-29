/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMessageTimeToken,
  CommonAlertParams,
  CommonAlertFilter,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_PATTERN,
  ALERT_MISSING_MONITORING_DATA,
  ALERT_DETAILS,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { RawAlertInstance, SanitizedAlert } from '../../../alerts/common';
import { parseDuration } from '../../../alerts/common/parse_duration';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { fetchMissingMonitoringData } from '../lib/alerts/fetch_missing_monitoring_data';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

// Go a bit farther back because we need to detect the difference between seeing the monitoring data versus just not looking far enough back
const LIMIT_BUFFER = 3 * 60 * 1000;

export class MissingMonitoringDataAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_MISSING_MONITORING_DATA,
      name: ALERT_DETAILS[ALERT_MISSING_MONITORING_DATA].label,
      accessorKey: 'gapDuration',
      fetchClustersRange: LIMIT_BUFFER,
      defaultParams: {
        duration: '15m',
        limit: '1d',
      },
      throttle: '6h',
      actionVariables: [
        {
          name: 'nodes',
          description: i18n.translate('xpack.monitoring.alerts.missingData.actionVariables.nodes', {
            defaultMessage: 'The list of nodes missing monitoring data.',
          }),
        },
        {
          name: 'count',
          description: i18n.translate('xpack.monitoring.alerts.missingData.actionVariables.count', {
            defaultMessage: 'The number of nodes missing monitoring data.',
          }),
        },
        ...Object.values(AlertingDefaults.ALERT_TYPE.context),
      ],
    });
  }
  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let indexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN);
    if (availableCcs) {
      indexPattern = getCcsIndexPattern(indexPattern, availableCcs);
    }
    const duration = parseDuration(params.duration);
    const limit = parseDuration(params.limit!);
    const now = +new Date();
    const missingData = await fetchMissingMonitoringData(
      callCluster,
      clusters,
      indexPattern,
      Globals.app.config.ui.max_bucket_size,
      now,
      now - limit - LIMIT_BUFFER
    );
    return missingData.map((missing) => {
      return {
        clusterUuid: missing.clusterUuid,
        shouldFire: missing.gapDuration > duration,
        severity: AlertSeverity.Danger,
        meta: { ...missing, limit },
        ccs: missing.ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    return super.filterAlertInstance(alertInstance, filters, true);
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    const base = super.getDefaultAlertState(cluster, item);
    return {
      ...base,
      ui: {
        ...base.ui,
        severity: AlertSeverity.Danger,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const { nodeName, gapDuration } = item.meta as {
      nodeName: string;
      gapDuration: number;
      limit: number;
    };
    return {
      text: i18n.translate('xpack.monitoring.alerts.missingData.ui.firingMessage', {
        defaultMessage: `For the past {gapDuration}, we have not detected any monitoring data from the Elasticsearch node: {nodeName}, starting at #absolute`,
        values: {
          gapDuration: moment.duration(gapDuration, 'milliseconds').humanize(),
          nodeName,
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.missingData.ui.nextSteps.viewAll', {
            defaultMessage: `#start_linkView all Elasticsearch nodes#end_link`,
          }),
          'elasticsearch/nodes',
          AlertMessageTokenType.Link
        ),
        {
          text: i18n.translate('xpack.monitoring.alerts.missingData.ui.nextSteps.verifySettings', {
            defaultMessage: `Verify monitoring settings on the node`,
          }),
        },
      ],
      tokens: [
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: alertState.ui.triggeredMS,
        } as AlertMessageTimeToken,
      ],
    };
  }

  protected executeActions(
    instance: AlertInstance,
    { alertStates }: { alertStates: AlertState[] },
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    const firingNodes = alertStates.filter((alertState) => alertState.ui.isFiring);
    const firingCount = firingNodes.length;

    if (firingCount > 0) {
      const shortActionText = i18n.translate('xpack.monitoring.alerts.missingData.shortAction', {
        defaultMessage:
          'Verify these nodes are up and running, then double check the monitoring settings.',
      });
      const fullActionText = i18n.translate('xpack.monitoring.alerts.missingData.fullAction', {
        defaultMessage: 'View what monitoring data we do have for these nodes.',
      });

      const ccs = alertStates.find((state) => state.ccs)?.ccs;
      const globalStateLink = this.createGlobalStateLink('overview', cluster.clusterUuid, ccs);
      const action = `[${fullActionText}](${globalStateLink})`;
      const internalShortMessage = i18n.translate(
        'xpack.monitoring.alerts.missingData.firing.internalShortMessage',
        {
          defaultMessage: `We have not detected any monitoring data for {count} node(s) in cluster: {clusterName}. {shortActionText}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            shortActionText,
          },
        }
      );
      const internalFullMessage = i18n.translate(
        'xpack.monitoring.alerts.missingData.firing.internalFullMessage',
        {
          defaultMessage: `We have not detected any monitoring data for {count} node(s) in cluster: {clusterName}. {action}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            action,
          },
        }
      );
      instance.scheduleActions('default', {
        internalShortMessage,
        internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
        state: AlertingDefaults.ALERT_STATE.firing,
        nodes: firingNodes.map((state) => `node: ${state.nodeName}`).toString(),
        count: firingCount,
        clusterName: cluster.clusterName,
        action,
        actionPlain: shortActionText,
      });
    }
  }
}
