/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { ElasticsearchClient } from 'kibana/server';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMessageTimeToken,
  CommonAlertParams,
  CommonAlertFilter,
  AlertNodeState,
} from '../../common/types/alerts';
import { Alert } from '../../../alerting/server';
import { RULE_MISSING_MONITORING_DATA, RULE_DETAILS } from '../../common/constants';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { RawAlertInstance, SanitizedAlert } from '../../../alerting/common';
import { parseDuration } from '../../../alerting/common/parse_duration';
import { fetchMissingMonitoringData } from '../lib/alerts/fetch_missing_monitoring_data';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

// Go a bit farther back because we need to detect the difference between seeing the monitoring data versus just not looking far enough back
const LIMIT_BUFFER = 3 * 60 * 1000;

export class MissingMonitoringDataRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedAlert) {
    super(sanitizedRule, {
      id: RULE_MISSING_MONITORING_DATA,
      name: RULE_DETAILS[RULE_MISSING_MONITORING_DATA].label,
      accessorKey: 'gapDuration',
      fetchClustersRange: LIMIT_BUFFER,
      defaultParams: {
        duration: '15m',
        limit: '1d',
      },
      throttle: '6h',
      actionVariables: [
        {
          name: 'node',
          description: i18n.translate('xpack.monitoring.alerts.missingData.actionVariables.node', {
            defaultMessage: 'The node missing monitoring data.',
          }),
        },
        ...Object.values(AlertingDefaults.ALERT_TYPE.context),
      ],
    });
  }
  protected async fetchData(
    params: CommonAlertParams,
    esClient: ElasticsearchClient,
    clusters: AlertCluster[]
  ): Promise<AlertData[]> {
    const duration = parseDuration(params.duration);
    const limit = parseDuration(params.limit!);
    const now = +new Date();
    const missingData = await fetchMissingMonitoringData(
      esClient,
      clusters,
      Globals.app.config.ui.max_bucket_size,
      now,
      now - limit - LIMIT_BUFFER,
      params.filterQuery
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
    instance: Alert,
    { alertStates }: { alertStates: AlertState[] },
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (alertStates.length === 0) {
      return;
    }
    const firingNode = alertStates[0] as AlertNodeState;
    if (!firingNode || !firingNode.ui.isFiring) {
      return;
    }

    const shortActionText = i18n.translate('xpack.monitoring.alerts.missingData.shortAction', {
      defaultMessage:
        'Verify the node is up and running, then double check the monitoring settings.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.missingData.fullAction', {
      defaultMessage: 'View what monitoring data we do have for this node.',
    });

    const ccs = alertStates.find((state) => state.ccs)?.ccs;
    const globalStateLink = this.createGlobalStateLink(
      `elasticsearch/nodes/${firingNode.nodeId}`,
      cluster.clusterUuid,
      ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.missingData.firing.internalShortMessage',
      {
        defaultMessage: `We have not detected any monitoring data for node {nodeName} in cluster: {clusterName}. {shortActionText}`,
        values: {
          clusterName: cluster.clusterName,
          nodeName: firingNode.nodeName,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.missingData.firing.internalFullMessage',
      {
        defaultMessage: `We have not detected any monitoring data for node {nodeName} in cluster: {clusterName}. {action}`,
        values: {
          clusterName: cluster.clusterName,
          nodeName: firingNode.nodeName,
          action,
        },
      }
    );
    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      /* continue to send "nodes" and "count" values for users before https://github.com/elastic/kibana/pull/102544
          see https://github.com/elastic/kibana/issues/100136#issuecomment-865229431
          */
      nodes: `node: ${firingNode.nodeName}`,
      count: 1,
      node: `node: ${firingNode.nodeName}`,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
