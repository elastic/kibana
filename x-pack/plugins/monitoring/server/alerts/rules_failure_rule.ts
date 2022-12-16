/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { ElasticsearchClient } from '@kbn/core/server';
import { Alert } from '@kbn/alerting-plugin/server';
import { RawAlertInstance, SanitizedRule } from '@kbn/alerting-plugin/common';
import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertParams,
  CommonAlertFilter,
  AlertRuleFailuresStats,
  AlertRulesState,
} from '../../common/types/alerts';
import { RULE_RULES_FAILURE, RULE_DETAILS } from '../../common/constants';
import { ROUNDED_FLOAT } from '../../common/formatting';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';
import { fetchKibanaNodeRules } from '../lib/alerts/fetch_kibana_node_rules';

export class RulesFailureRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedRule) {
    super(sanitizedRule, {
      id: RULE_RULES_FAILURE,
      name: RULE_DETAILS[RULE_RULES_FAILURE].label,
      accessorKey: 'rulesFailure',
      defaultParams: {
        threshold: 85,
        duration: '5m',
      },
      actionVariables: [
        {
          name: 'cluster',
          description: i18n.translate(
            'xpack.monitoring.alerts.rulesFailures.actionVariables.node',
            {
              defaultMessage: 'The cluster reporting rules falures.',
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
    const duration = parseDuration(params.duration);
    const endMs = +new Date();
    const startMs = endMs - duration;
    const stats = await fetchKibanaNodeRules(
      esClient,
      clusters,
      startMs,
      endMs,
      Globals.app.config.ui.max_bucket_size,
      params.filterQuery
    );
    return stats.map((stat) => {
      return {
        clusterUuid: stat.clusterUuid,
        shouldFire: stat.failures > params.threshold!,
        severity: AlertSeverity.Danger,
        meta: stat,
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
    const stat = item.meta as AlertRuleFailuresStats;
    return {
      text: i18n.translate('xpack.monitoring.alerts.rulesFailures.ui.firingMessage', {
        defaultMessage: `Cluster #start_link{nodeName}#end_link is reporting rules failures of {rulesFailures}% at #absolute`,
        values: {
          clusterUuid: stat.clusterUuid,
          rulesFailures: numeral(stat.failures).format(ROUNDED_FLOAT),
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.rulesFailures.ui.nextSteps.hotThreads', {
            defaultMessage: '#start_linkCheck hot threads#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/cluster-nodes-hot-threads.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.rulesFailures.ui.nextSteps.runningTasks', {
            defaultMessage: '#start_linkCheck long running tasks#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/tasks.html`
        ),
      ],
      tokens: [
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: alertState.ui.triggeredMS,
        } as AlertMessageTimeToken,
        {
          startToken: '#start_link',
          endToken: '#end_link',
          type: AlertMessageTokenType.Link,
          url: `app/management/insightsAndAlerting/triggersActions/rules`,
        } as AlertMessageLinkToken,
      ],
    };
  }

  protected executeActions(
    instance: Alert,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (alertStates.length === 0) {
      return;
    }
    const firingNode = alertStates[0] as AlertRulesState;
    if (!firingNode || !firingNode.ui.isFiring) {
      return;
    }
    const shortActionText = i18n.translate('xpack.monitoring.alerts.rulesFailures.shortAction', {
      defaultMessage: 'Verify cluster rules.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.rulesFailures.fullAction', {
      defaultMessage: 'Verify cluster rules',
    });

    const ccs = firingNode.ccs;
    const globalStateLink = this.createGlobalStateLink(
      `app/management/insightsAndAlerting/triggersActions/rules`,
      cluster.clusterUuid,
      ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.rulesFailures.firing.internalShortMessage',
      {
        defaultMessage: `Rules failures is firing in cluster: {clusterName}. {shortActionText}`,
        values: {
          clusterName: cluster.clusterName,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.rulesFailures.firing.internalFullMessage',
      {
        defaultMessage: `Rules failures alert is firing in cluster: {clusterName}. {action}`,
        values: {
          clusterName: cluster.clusterName,
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
      nodes: `${firingNode.nodeName}:${firingNode.failures}`,
      count: 1,
      node: `${firingNode.nodeName}:${firingNode.failures}`,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
