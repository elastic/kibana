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
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
  LEGACY_ALERT_DETAILS,
  INDEX_PATTERN_ELASTICSEARCH,
} from '../../common/constants';
import { AlertSeverity } from '../../common/enums';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';
import { Globals } from '../static_globals';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { fetchElasticsearchVersions } from '../lib/alerts/fetch_elasticsearch_versions';

export class ElasticsearchVersionMismatchAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_ELASTICSEARCH_VERSION_MISMATCH,
      name: LEGACY_ALERT_DETAILS[ALERT_ELASTICSEARCH_VERSION_MISMATCH].label,
      interval: '1d',
      actionVariables: [
        {
          name: 'versionList',
          description: i18n.translate(
            'xpack.monitoring.alerts.elasticsearchVersionMismatch.actionVariables.clusterHealth',
            {
              defaultMessage: 'The versions of Elasticsearch running in this cluster.',
            }
          ),
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
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const elasticsearchVersions = await fetchElasticsearchVersions(
      callCluster,
      clusters,
      esIndexPattern,
      Globals.app.config.ui.max_bucket_size
    );

    return elasticsearchVersions.map((elasticsearchVersion) => {
      return {
        shouldFire: elasticsearchVersion.versions.length > 1,
        severity: AlertSeverity.Warning,
        meta: elasticsearchVersion,
        clusterUuid: elasticsearchVersion.clusterUuid,
        ccs: elasticsearchVersion.ccs,
      };
    });
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const { versions } = item.meta as AlertVersions;
    const text = i18n.translate(
      'xpack.monitoring.alerts.elasticsearchVersionMismatch.ui.firingMessage',
      {
        defaultMessage: `Multiple versions of Elasticsearch ({versions}) running in this cluster.`,
        values: {
          versions: versions.join(', '),
        },
      }
    );

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
      'xpack.monitoring.alerts.elasticsearchVersionMismatch.shortAction',
      {
        defaultMessage: 'Verify you have the same version across all nodes.',
      }
    );
    const fullActionText = i18n.translate(
      'xpack.monitoring.alerts.elasticsearchVersionMismatch.fullAction',
      {
        defaultMessage: 'View nodes',
      }
    );
    const globalStateLink = this.createGlobalStateLink(
      'elasticsearch/nodes',
      cluster.clusterUuid,
      state.ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    instance.scheduleActions('default', {
      internalShortMessage: i18n.translate(
        'xpack.monitoring.alerts.elasticsearchVersionMismatch.firing.internalShortMessage',
        {
          defaultMessage: `Elasticsearch version mismatch alert is firing for {clusterName}. {shortActionText}`,
          values: {
            clusterName: cluster.clusterName,
            shortActionText,
          },
        }
      ),
      internalFullMessage: i18n.translate(
        'xpack.monitoring.alerts.elasticsearchVersionMismatch.firing.internalFullMessage',
        {
          defaultMessage: `Elasticsearch version mismatch alert is firing for {clusterName}. Elasticsearch is running {versions}. {action}`,
          values: {
            clusterName: cluster.clusterName,
            versions: versions.join(', '),
            action,
          },
        }
      ),
      state: AlertingDefaults.ALERT_STATE.firing,
      clusterName: cluster.clusterName,
      versionList: versions,
      action,
      actionPlain: shortActionText,
    });
  }
}
