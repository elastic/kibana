/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiHealth,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { RuleStatusDropdown } from '../..';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import { RulesListNotifyBadge } from '../../rules_list/components/notify_badge';
import { useLoadRuleEventLogs } from '../../../hooks/use_load_rule_event_logs';
import { RefreshToken } from './types';

export interface RuleStatusPanelProps {
  rule: any;
  isEditable: boolean;
  requestRefresh: () => void;
  healthColor: string;
  statusMessage?: string | null;
  refreshToken?: RefreshToken;
}

export type RuleStatusPanelWithApiProps = Pick<
  RuleApis,
  'bulkDisableRules' | 'bulkEnableRules' | 'snoozeRule' | 'unsnoozeRule'
> &
  RuleStatusPanelProps;

export const RuleStatusPanel: React.FC<RuleStatusPanelWithApiProps> = ({
  rule,
  bulkEnableRules,
  bulkDisableRules,
  snoozeRule,
  unsnoozeRule,
  requestRefresh,
  isEditable,
  healthColor,
  statusMessage,
  refreshToken,
}) => {
  const [lastNumberOfExecutions, setLastNumberOfExecutions] = useState<number | null>(null);
  const isInitialized = useRef(false);

  const onSnoozeRule = useCallback(
    (snoozeSchedule) => snoozeRule(rule, snoozeSchedule),
    [rule, snoozeRule]
  );
  const onUnsnoozeRule = useCallback(
    (scheduleIds) => unsnoozeRule(rule, scheduleIds),
    [rule, unsnoozeRule]
  );

  const statusMessageDisplay = useMemo(() => {
    if (!statusMessage) {
      return (
        <EuiStat
          titleSize="xs"
          title="--"
          description=""
          isLoading={!rule.lastRun?.outcome && !rule.nextRun}
        />
      );
    }
    return statusMessage;
  }, [rule, statusMessage]);

  const { data, loadEventLogs } = useLoadRuleEventLogs({
    id: rule.id,
    dateStart: 'now-24h',
    dateEnd: 'now',
    page: 0,
    perPage: 10,
  });

  useEffect(() => {
    if (!data) {
      return;
    }
    setLastNumberOfExecutions(data.total);
  }, [data]);

  const requestRefreshInternal = useCallback(() => {
    loadEventLogs();
    requestRefresh();
  }, [requestRefresh, loadEventLogs]);

  const onDisableRule = useCallback(
    (untrack: boolean) => {
      return bulkDisableRules({ ids: [rule.id], untrack });
    },
    [bulkDisableRules, rule.id]
  );

  useEffect(() => {
    if (isInitialized.current) {
      loadEventLogs();
    }
    isInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  return (
    <EuiPanel data-test-subj="ruleStatusPanel" hasBorder paddingSize="none">
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h5>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleDetails.rule.statusPanel.ruleIsEnabledDisabledTitle"
                  defaultMessage="Rule is"
                />
              </h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <RuleStatusDropdown
              disableRule={onDisableRule}
              enableRule={() => bulkEnableRules({ ids: [rule.id] })}
              snoozeRule={async () => {}}
              unsnoozeRule={async () => {}}
              rule={rule}
              onRuleChanged={requestRefreshInternal}
              direction="row"
              isEditable={isEditable}
              hideSnoozeOption
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued" data-test-subj="ruleStatus-numberOfExecutions">
          {lastNumberOfExecutions !== null && (
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.rule.statusPanel.totalExecutions"
              defaultMessage="{executions, plural, one {# execution} other {# executions}} in the last 24 hr"
              values={{ executions: lastNumberOfExecutions }}
            />
          )}
        </EuiText>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup gutterSize="none" direction="row" responsive={false}>
          <EuiFlexItem>
            <EuiStat
              data-test-subj={`ruleStatus-${rule.executionStatus.status}`}
              titleSize="m"
              descriptionElement="strong"
              titleElement="h5"
              title={
                <EuiHealth
                  data-test-subj={`ruleStatus-${rule.executionStatus.status}`}
                  textSize="m"
                  color={healthColor}
                  style={{ fontWeight: 400 }}
                >
                  {statusMessageDisplay}
                </EuiHealth>
              }
              description={i18n.translate(
                'xpack.triggersActionsUI.sections.ruleDetails.rulesList.ruleLastExecutionDescription',
                {
                  defaultMessage: `Last response`,
                }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xs" />
            <EuiText color="subdued" size="xs">
              {moment(rule.executionStatus.lastExecutionDate).fromNow()}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiPanel hasShadow={false}>
        <RulesListNotifyBadge
          snoozeSettings={rule}
          loading={!rule}
          disabled={!isEditable}
          onRuleChanged={requestRefreshInternal}
          snoozeRule={onSnoozeRule}
          unsnoozeRule={onUnsnoozeRule}
          showTooltipInline
        />
      </EuiPanel>
    </EuiPanel>
  );
};

const RuleStatusPanelWithApi = withBulkRuleOperations(RuleStatusPanel);

// eslint-disable-next-line import/no-default-export
export { RuleStatusPanelWithApi as default };
