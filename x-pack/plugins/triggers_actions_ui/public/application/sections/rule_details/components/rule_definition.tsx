/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RuleDefinitionProps } from '../../../../types';
import { RuleType, useLoadRuleTypes } from '../../../..';
import { useKibana } from '../../../../common/lib/kibana';
import { hasAllPrivilege, hasExecuteActionsCapability } from '../../../lib/capabilities';
import { NOTIFY_WHEN_OPTIONS } from '../../rule_form/rule_notify_when';
import { RuleActions } from './rule_actions';
import { RuleEdit } from '../../rule_form';

const OBSERVABILITY_SOLUTIONS = ['logs', 'uptime', 'infrastructure', 'apm'];

export const RuleDefinition: React.FunctionComponent<RuleDefinitionProps> = ({
  rule,
  actionTypeRegistry,
  ruleTypeRegistry,
  onEditRule,
}) => {
  const {
    application: { capabilities },
  } = useKibana().services;

  const [editFlyoutVisible, setEditFlyoutVisible] = useState<boolean>(false);
  const [ruleType, setRuleType] = useState<RuleType>();
  const { ruleTypes, ruleTypeIndex } = useLoadRuleTypes({
    filteredSolutions: OBSERVABILITY_SOLUTIONS,
  });

  const getRuleType = useMemo(() => {
    if (ruleTypes.length && rule) {
      return ruleTypes.find((type) => type.id === rule.ruleTypeId);
    }
  }, [rule, ruleTypes]);

  useEffect(() => {
    setRuleType(getRuleType);
  }, [getRuleType]);

  const getRuleConditionsWording = () => {
    const numberOfConditions = rule?.params.criteria ? (rule?.params.criteria as any[]).length : 0;
    return (
      <>
        {numberOfConditions}&nbsp;
        {i18n.translate('xpack.triggersActionsUI.ruleDetails.conditions', {
          defaultMessage: 'condition{s}',
          values: {
            s: numberOfConditions > 1 || numberOfConditions === 0 ? 's' : '',
          },
        })}
      </>
    );
  };
  const getNotifyText = () =>
    NOTIFY_WHEN_OPTIONS.find((options) => options.value === rule?.notifyWhen)?.inputDisplay ||
    rule?.notifyWhen;

  const canExecuteActions = hasExecuteActionsCapability(capabilities);
  const canSaveRule =
    rule &&
    hasAllPrivilege(rule, ruleType) &&
    // if the rule has actions, can the user save the rule's action params
    (canExecuteActions || (!canExecuteActions && rule.actions.length === 0));
  const hasEditButton =
    // can the user save the rule
    canSaveRule &&
    // is this rule type editable from within Rules Management
    (ruleTypeRegistry.has(rule.ruleTypeId)
      ? !ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext
      : false);
  return (
    <EuiFlexItem data-test-subj="ruleSummaryRuleDefinition" grow={3}>
      <EuiPanel color="subdued" hasBorder={false} paddingSize={'m'}>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiTitle size="s">
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.triggersActionsUI.ruleDetails.definition', {
                defaultMessage: 'Definition',
              })}
            </EuiFlexItem>
          </EuiTitle>
          {hasEditButton && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="ruleDetailsEditButton"
                iconType={'pencil'}
                onClick={() => setEditFlyoutVisible(true)}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFlexGroup alignItems="baseline">
          <EuiFlexItem>
            <EuiFlexGroup>
              <ItemTitleRuleSummary>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.ruleType', {
                  defaultMessage: 'Rule type',
                })}
              </ItemTitleRuleSummary>
              <ItemValueRuleSummary
                data-test-subj="ruleSummaryRuleType"
                itemValue={ruleTypeIndex.get(rule.ruleTypeId)?.name || rule.ruleTypeId}
              />
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup alignItems="flexStart" responsive={false}>
              <ItemTitleRuleSummary>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.description', {
                  defaultMessage: 'Description',
                })}
              </ItemTitleRuleSummary>
              <ItemValueRuleSummary
                data-test-subj="ruleSummaryRuleDescription"
                itemValue={ruleTypeRegistry.get(rule.ruleTypeId).description}
              />
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup>
              <ItemTitleRuleSummary>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.conditionsTitle', {
                  defaultMessage: 'Conditions',
                })}
              </ItemTitleRuleSummary>
              <EuiFlexItem grow={3}>
                <EuiFlexGroup data-test-subj="ruleSummaryRuleConditions" alignItems="center">
                  {hasEditButton ? (
                    <EuiButtonEmpty onClick={() => setEditFlyoutVisible(true)}>
                      <EuiText size="s">{getRuleConditionsWording()}</EuiText>
                    </EuiButtonEmpty>
                  ) : (
                    <EuiText size="s">{getRuleConditionsWording()}</EuiText>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup>
              <ItemTitleRuleSummary>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.runsEvery', {
                  defaultMessage: 'Runs every',
                })}
              </ItemTitleRuleSummary>

              <ItemValueRuleSummary
                data-test-subj="ruleSummaryRuleInterval"
                itemValue={formatInterval(rule.schedule.interval)}
              />
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup>
              <ItemTitleRuleSummary>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.notifyWhen', {
                  defaultMessage: 'Notify',
                })}
              </ItemTitleRuleSummary>
              <ItemValueRuleSummary itemValue={String(getNotifyText())} />
            </EuiFlexGroup>

            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="baseline">
              <ItemTitleRuleSummary>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.actions', {
                  defaultMessage: 'Actions',
                })}
              </ItemTitleRuleSummary>
              <EuiFlexItem grow={3}>
                <RuleActions ruleActions={rule.actions} actionTypeRegistry={actionTypeRegistry} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {editFlyoutVisible && (
        <RuleEdit
          onSave={() => {
            setEditFlyoutVisible(false);
            return onEditRule();
          }}
          initialRule={rule}
          onClose={() => setEditFlyoutVisible(false)}
          ruleTypeRegistry={ruleTypeRegistry}
          actionTypeRegistry={actionTypeRegistry}
        />
      )}
    </EuiFlexItem>
  );
};

export interface ItemTitleRuleSummaryProps {
  children: string;
}
export interface ItemValueRuleSummaryProps {
  itemValue: string;
  extraSpace?: boolean;
}

function ItemValueRuleSummary({
  itemValue,
  extraSpace = true,
  ...otherProps
}: ItemValueRuleSummaryProps) {
  return (
    <EuiFlexItem grow={extraSpace ? 3 : 1} {...otherProps}>
      <EuiText size="s">{itemValue}</EuiText>
    </EuiFlexItem>
  );
}

function ItemTitleRuleSummary({ children }: ItemTitleRuleSummaryProps) {
  return (
    <EuiTitle size="xxs">
      <EuiFlexItem style={{ whiteSpace: 'nowrap' }} grow={1}>
        {children}
      </EuiFlexItem>
    </EuiTitle>
  );
}

export type TimeUnitChar = 's' | 'm' | 'h' | 'd';

const formatInterval = (ruleInterval: string) => {
  const interval: string[] | null = ruleInterval.match(/(^\d*)([s|m|h|d])/);
  if (!interval || interval.length < 3) return ruleInterval;
  const value: number = +interval[1];
  const unit = interval[2] as TimeUnitChar;
  return formatDurationFromTimeUnitChar(value, unit);
};
const formatDurationFromTimeUnitChar = (time: number, unit: TimeUnitChar): string => {
  const sForPlural = time !== 0 && time > 1 ? 's' : ''; // Negative values are not taken into account
  switch (unit) {
    case 's':
      return `${time} sec${sForPlural}`;
    case 'm':
      return `${time} min${sForPlural}`;
    case 'h':
      return `${time} hr${sForPlural}`;
    case 'd':
      return `${time} day${sForPlural}`;
    default:
      return `${time} ${unit}`;
  }
};
// eslint-disable-next-line import/no-default-export
export { RuleDefinition as default };
