/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import type { GlobalWidgetParameters, WidgetRenderAPI } from '@kbn/investigate-plugin/public';
import { useTheme } from '@kbn/observability-shared-plugin/public';
import {
  AlertConsumers,
  AlertStatus,
  ALERT_INSTANCE_ID,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_UUID,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import moment from 'moment';
import React, { useEffect, useRef } from 'react';
import { asDuration } from '../../../common';
import { useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useFetchRuleTypes } from '../../hooks/use_fetch_rule_types';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../hooks/use_kibana';
import { TopAlert } from '../../typings/alerts';
import { getDefaultAlertSummaryTimeRange } from '../../utils/alert_summary_widget';
import { createInvestigateAlertsInventoryWidget } from '../investigate_alerts_inventory/create_investigate_alerts_inventory_widget';

function InvestigateAlertsDetailHeaderField({
  title,
  value,
}: {
  title: string;
  value: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="none">
        <EuiText size="s" color="subdued">
          {title}:&nbsp;
        </EuiText>
        <EuiText
          css={css`
            font-weight: ${theme.eui.euiFontWeightSemiBold};
          `}
          size="s"
        >
          {value}
        </EuiText>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

function InvestigateAlertsDetailHeader({
  name,
  status,
  start,
  timestamp,
  duration,
  reason,
}: {
  name: string;
  status: AlertStatus;
  start: number;
  timestamp: number;
  duration: number;
  reason: string;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>{name}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs">{reason}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="m">
          <AlertLifecycleStatusBadge alertStatus={status} />
          <InvestigateAlertsDetailHeaderField
            title={i18n.translate(
              'xpack.observability.investigateAlertsDetail.headerFieldTriggered',
              { defaultMessage: 'Triggered' }
            )}
            value={moment(start).locale(i18n.getLocale()).fromNow()}
          />
          <InvestigateAlertsDetailHeaderField
            title={i18n.translate(
              'xpack.observability.investigateAlertsDetail.headerFieldDuration',
              { defaultMessage: 'Duration' }
            )}
            value={asDuration(duration)}
          />
          <InvestigateAlertsDetailHeaderField
            title={i18n.translate(
              'xpack.observability.investigateAlertsDetail.headerFieldLastStatusUpdate',
              { defaultMessage: 'Last status update' }
            )}
            value={moment(timestamp).locale(i18n.getLocale()).fromNow()}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function InvestigateAlertSummary({ rule, alert }: { rule: Rule; alert: TopAlert }) {
  const ruleUuid = rule.id;
  const alertInstanceId = alert.fields[ALERT_INSTANCE_ID];

  const {
    triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
  } = useKibana();

  const filteredRuleTypes = useGetFilteredRuleTypes();

  const { ruleTypes } = useFetchRuleTypes({
    filterByRuleTypeIds: filteredRuleTypes,
  });
  const ruleType = ruleTypes?.find((type) => type.id === rule?.ruleTypeId);
  const featureIds =
    rule?.consumer === ALERTING_FEATURE_ID && ruleType?.producer
      ? [ruleType.producer as AlertConsumers]
      : rule
      ? [rule.consumer as AlertConsumers]
      : [];

  return (
    <AlertSummaryWidget
      featureIds={featureIds}
      timeRange={getDefaultAlertSummaryTimeRange()}
      fullSize
      hideStats
      filter={{
        bool: {
          must: [
            {
              term: {
                [ALERT_RULE_UUID]: ruleUuid,
              },
            },
            ...(alertInstanceId && alertInstanceId !== '*'
              ? [
                  {
                    term: {
                      [ALERT_INSTANCE_ID]: alertInstanceId,
                    },
                  },
                ]
              : []),
          ],
        },
      }}
    />
  );
}

export function InvestigateAlertsDetail({
  filters,
  query,
  timeRange,
  alertUuid,
  blocks,
  onWidgetAdd,
}: GlobalWidgetParameters & {
  alertUuid: string;
  blocks: WidgetRenderAPI['blocks'];
  onWidgetAdd: WidgetRenderAPI['onWidgetAdd'];
}) {
  const [loading, alertData] = useFetchAlertDetail(alertUuid);

  const parsedAlert = alertData?.formatted;

  const ruleId = parsedAlert?.fields[ALERT_RULE_UUID];
  const { rule } = useFetchRule({
    ruleId,
  });

  const onWidgetAddRef = useRef(onWidgetAdd);

  onWidgetAddRef.current = onWidgetAdd;

  const ruleName = parsedAlert?.fields[ALERT_RULE_NAME];

  useEffect(() => {
    if (!ruleName || !parsedAlert) {
      return;
    }

    return blocks.publish([
      {
        id: 'more_alerts_like_this',
        loading: false,
        content: i18n.translate('xpack.observability.investigateAlertsDetail.findRelatedAlerts', {
          defaultMessage: 'Find related alerts',
        }),
        onClick: () => {
          onWidgetAddRef.current(
            createInvestigateAlertsInventoryWidget({
              title: i18n.translate('xpack.observability.investigateAlertsDetail.alertsRelatedTo', {
                defaultMessage: 'Related alerts for {ruleName}',
                values: {
                  ruleName,
                },
              }),
              parameters: {
                relatedAlertUuid: parsedAlert.fields[ALERT_UUID],
              },
            })
          );
        },
      },
    ]);
  }, [blocks, ruleName, parsedAlert]);

  if (!parsedAlert && loading) {
    return <EuiLoadingSpinner />;
  }

  if (!parsedAlert) {
    return (
      <EuiCallOut
        color="warning"
        title={i18n.translate('xpack.observability.investigateAlertsDetail.alertNotFound', {
          defaultMessage: 'Alert not found',
        })}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <InvestigateAlertsDetailHeader
          name={parsedAlert.fields[ALERT_RULE_NAME]!}
          status={parsedAlert.fields[ALERT_STATUS]! as AlertStatus}
          start={parsedAlert.start}
          duration={parsedAlert.lastUpdated}
          timestamp={new Date(parsedAlert.fields['@timestamp']).getTime()}
          reason={parsedAlert.reason}
        />
      </EuiFlexItem>
      {rule && parsedAlert ? (
        <EuiFlexItem grow={false}>
          <InvestigateAlertSummary rule={rule} alert={parsedAlert} />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
