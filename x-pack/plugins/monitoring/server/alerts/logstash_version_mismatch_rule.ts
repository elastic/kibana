/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from 'kibana/server';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertInstanceState,
  CommonAlertParams,
  AlertVersions,
} from '../../common/types/alerts';
import { Alert } from '../../../alerting/server';
import { RULE_LOGSTASH_VERSION_MISMATCH, LEGACY_RULE_DETAILS } from '../../common/constants';
import { AlertSeverity } from '../../common/enums';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerting/common';
import { Globals } from '../static_globals';
import { fetchLogstashVersions } from '../lib/alerts/fetch_logstash_versions';

export class LogstashVersionMismatchRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedAlert) {
    super(sanitizedRule, {
      id: RULE_LOGSTASH_VERSION_MISMATCH,
      name: LEGACY_RULE_DETAILS[RULE_LOGSTASH_VERSION_MISMATCH].label,
      interval: '1d',
      actionVariables: [
        {
          name: 'versionList',
          description: i18n.translate(
            'xpack.monitoring.alerts.logstashVersionMismatch.actionVariables.clusterHealth',
            {
              defaultMessage: 'The versions of Logstash running in this cluster.',
            }
          ),
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
    const logstashVersions = await fetchLogstashVersions(
      esClient,
      clusters,
      Globals.app.config.ui.max_bucket_size,
      params.filterQuery
    );

    return logstashVersions.map((logstashVersion) => {
      return {
        shouldFire: logstashVersion.versions.length > 1,
        severity: AlertSeverity.Warning,
        meta: logstashVersion,
        clusterUuid: logstashVersion.clusterUuid,
        ccs: logstashVersion.ccs,
      };
    });
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const { versions } = item.meta as AlertVersions;
    const text = i18n.translate(
      'xpack.monitoring.alerts.logstashVersionMismatch.ui.firingMessage',
      {
        defaultMessage: `Multiple versions of Logstash ({versions}) running in this cluster.`,
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
    instance: Alert,
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
      'xpack.monitoring.alerts.logstashVersionMismatch.shortAction',
      {
        defaultMessage: 'Verify you have the same version across all nodes.',
      }
    );
    const fullActionText = i18n.translate(
      'xpack.monitoring.alerts.logstashVersionMismatch.fullAction',
      {
        defaultMessage: 'View nodes',
      }
    );
    const globalStateLink = this.createGlobalStateLink(
      'logstash/nodes',
      cluster.clusterUuid,
      state.ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    instance.scheduleActions('default', {
      internalShortMessage: i18n.translate(
        'xpack.monitoring.alerts.logstashVersionMismatch.firing.internalShortMessage',
        {
          defaultMessage: `Logstash version mismatch alert is firing for {clusterName}. {shortActionText}`,
          values: {
            clusterName: cluster.clusterName,
            shortActionText,
          },
        }
      ),
      internalFullMessage: i18n.translate(
        'xpack.monitoring.alerts.logstashVersionMismatch.firing.internalFullMessage',
        {
          defaultMessage: `Logstash version mismatch alert is firing for {clusterName}. Logstash is running {versions}. {action}`,
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
