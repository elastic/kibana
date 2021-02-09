/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertInstanceState,
  CommonAlertParams,
  AlertVersions,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import {
  ALERT_KIBANA_VERSION_MISMATCH,
  LEGACY_ALERT_DETAILS,
  INDEX_PATTERN_KIBANA,
} from '../../common/constants';
import { AlertSeverity } from '../../common/enums';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';
import { Globals } from '../static_globals';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { fetchKibanaVersions } from '../lib/alerts/fetch_kibana_versions';

export class KibanaVersionMismatchAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_KIBANA_VERSION_MISMATCH,
      name: LEGACY_ALERT_DETAILS[ALERT_KIBANA_VERSION_MISMATCH].label,
      interval: '1d',
      actionVariables: [
        {
          name: 'versionList',
          description: i18n.translate(
            'xpack.monitoring.alerts.kibanaVersionMismatch.actionVariables.clusterHealth',
            {
              defaultMessage: 'The versions of Kibana running in this cluster.',
            }
          ),
        },
        {
          name: 'clusterName',
          description: i18n.translate(
            'xpack.monitoring.alerts.kibanaVersionMismatch.actionVariables.clusterName',
            {
              defaultMessage: 'The cluster to which the instances belong.',
            }
          ),
        },
        AlertingDefaults.ALERT_TYPE.context.internalShortMessage,
        AlertingDefaults.ALERT_TYPE.context.internalFullMessage,
        AlertingDefaults.ALERT_TYPE.context.state,
        AlertingDefaults.ALERT_TYPE.context.action,
        AlertingDefaults.ALERT_TYPE.context.actionPlain,
      ],
    });
  }

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let kibanaIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_KIBANA);
    if (availableCcs) {
      kibanaIndexPattern = getCcsIndexPattern(kibanaIndexPattern, availableCcs);
    }
    const kibanaVersions = await fetchKibanaVersions(
      callCluster,
      clusters,
      kibanaIndexPattern,
      Globals.app.config.ui.max_bucket_size
    );

    return kibanaVersions.map((kibanaVersion) => {
      return {
        shouldFire: kibanaVersion.versions.length > 1,
        severity: AlertSeverity.Warning,
        meta: kibanaVersion,
        clusterUuid: kibanaVersion.clusterUuid,
        ccs: kibanaVersion.ccs,
      };
    });
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const { versions } = item.meta as AlertVersions;
    const text = i18n.translate('xpack.monitoring.alerts.kibanaVersionMismatch.ui.firingMessage', {
      defaultMessage: `Multiple versions of Kibana ({versions}) running in this cluster.`,
      values: {
        versions: versions.join(', '),
      },
    });

    return {
      text,
    };
  }

  protected async executeActions(
    instance: AlertInstance,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (alertStates.length === 0) {
      return;
    }

    // Logic in the base alert assumes that all alerts will operate against multiple nodes/instances (such as a CPU alert against ES nodes)
    // However, some alerts operate on the state of the cluster itself and are only concerned with a single state
    const state = alertStates[0];
    const { versions } = state.meta as AlertVersions;
    const shortActionText = i18n.translate(
      'xpack.monitoring.alerts.kibanaVersionMismatch.shortAction',
      {
        defaultMessage: 'Verify you have the same version across all instances.',
      }
    );
    const fullActionText = i18n.translate(
      'xpack.monitoring.alerts.kibanaVersionMismatch.fullAction',
      {
        defaultMessage: 'View instances',
      }
    );
    const globalStateLink = this.createGlobalStateLink(
      'kibana/instances',
      cluster.clusterUuid,
      state.ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.kibanaVersionMismatch.firing.internalFullMessage',
      {
        defaultMessage: `Kibana version mismatch alert is firing for {clusterName}. Kibana is running {versions}. {action}`,
        values: {
          clusterName: cluster.clusterName,
          versions: versions.join(', '),
          action,
        },
      }
    );
    instance.scheduleActions('default', {
      internalShortMessage: i18n.translate(
        'xpack.monitoring.alerts.kibanaVersionMismatch.firing.internalShortMessage',
        {
          defaultMessage: `Kibana version mismatch alert is firing for {clusterName}. {shortActionText}`,
          values: {
            clusterName: cluster.clusterName,
            shortActionText,
          },
        }
      ),
      internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      clusterName: cluster.clusterName,
      versionList: versions,
      action,
      actionPlain: shortActionText,
    });
  }
}
