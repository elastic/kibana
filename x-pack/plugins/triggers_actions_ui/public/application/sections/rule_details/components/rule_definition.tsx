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
  EuiLoadingSpinner,
} from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { formatDuration } from '@kbn/alerting-plugin/common';
import { useLoadRuleTypesQuery } from '../../../hooks/use_load_rule_types_query';
import { RuleDefinitionProps } from '../../../../types';
import { RuleType } from '../../../..';
import { useKibana } from '../../../../common/lib/kibana';
import {
  hasAllPrivilege,
  hasExecuteActionsCapability,
  hasShowActionsCapability,
} from '../../../lib/capabilities';
import { RuleActions } from './rule_actions';
import { RuleEdit } from '../../rule_form';

export const RuleDefinition: React.FunctionComponent<RuleDefinitionProps> = ({
  rule,
  actionTypeRegistry,
  ruleTypeRegistry,
  onEditRule,
  hideEditButton = false,
  filteredRuleTypes = [],
}) => {
  const {
    application: { capabilities },
  } = useKibana().services;

  const [editFlyoutVisible, setEditFlyoutVisible] = useState<boolean>(false);
  const [ruleType, setRuleType] = useState<RuleType>();
  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading: ruleTypesIsLoading },
  } = useLoadRuleTypesQuery({
    filteredRuleTypes,
  });
  const ruleTypes = useMemo(() => [...ruleTypeIndex.values()], [ruleTypeIndex]);

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
    return i18n.translate('xpack.triggersActionsUI.ruleDetails.conditions', {
      defaultMessage: '{numberOfConditions, plural, one {# condition} other {# conditions}}',
      values: { numberOfConditions },
    });
  };
  const canReadActions = hasShowActionsCapability(capabilities);
  const canExecuteActions = hasExecuteActionsCapability(capabilities);
  const canSaveRule =
    rule &&
    hasAllPrivilege(rule.consumer, ruleType) &&
    // if the rule has actions, can the user save the rule's action params
    (canExecuteActions || (!canExecuteActions && rule.actions.length === 0));
  const hasEditButton = useMemo(() => {
    if (hideEditButton) {
      return false;
    }
    // can the user save the rule
    return (
      canSaveRule &&
      // is this rule type editable from within Rules Management
      (ruleTypeRegistry.has(rule.ruleTypeId)
        ? !ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext
        : false)
    );
  }, [hideEditButton, canSaveRule, ruleTypeRegistry, rule]);

  const ruleDescription = useMemo(() => {
    if (ruleTypeRegistry.has(rule.ruleTypeId)) {
      return ruleTypeRegistry.get(rule.ruleTypeId).description;
    }
    // TODO: Replace this generic description with proper SIEM rule descriptions
    if (rule.consumer === AlertConsumers.SIEM) {
      return i18n.translate('xpack.triggersActionsUI.ruleDetails.securityDetectionRule', {
        defaultMessage: 'Security detection rule',
      });
    }
    return '';
  }, [rule, ruleTypeRegistry]);

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
          {ruleTypesIsLoading ? (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner data-test-subj="ruleDetailsEditButtonLoadingSpinner" />
            </EuiFlexItem>
          ) : (
            hasEditButton && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="ruleDetailsEditButton"
                  iconType={'pencil'}
                  onClick={() => setEditFlyoutVisible(true)}
                />
              </EuiFlexItem>
            )
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
              {ruleTypesIsLoading ? (
                <EuiFlexItem>
                  <EuiLoadingSpinner data-test-subj="ruleSummaryRuleTypeLoadingSpinner" />
                </EuiFlexItem>
              ) : (
                <ItemValueRuleSummary
                  data-test-subj="ruleSummaryRuleType"
                  itemValue={ruleTypeIndex.get(rule.ruleTypeId)?.name || rule.ruleTypeId}
                />
              )}
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
                itemValue={ruleDescription}
              />
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup>
              <ItemTitleRuleSummary>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.runsEvery', {
                  defaultMessage: 'Runs every',
                })}
              </ItemTitleRuleSummary>

              <ItemValueRuleSummary
                data-test-subj="ruleSummaryRuleInterval"
                itemValue={formatDuration(rule.schedule.interval)}
              />
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup alignItems="center">
              <ItemTitleRuleSummary>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.conditionsTitle', {
                  defaultMessage: 'Conditions',
                })}
              </ItemTitleRuleSummary>
              <EuiFlexItem grow={3}>
                <EuiFlexGroup
                  data-test-subj="ruleSummaryRuleConditions"
                  alignItems="center"
                  gutterSize="none"
                >
                  <EuiFlexItem grow={false}>
                    {hasEditButton ? (
                      <EuiButtonEmpty onClick={() => setEditFlyoutVisible(true)} flush="left">
                        <EuiText size="s">{getRuleConditionsWording()}</EuiText>
                      </EuiButtonEmpty>
                    ) : (
                      <EuiText size="s">{getRuleConditionsWording()}</EuiText>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="baseline">
              <ItemTitleRuleSummary>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.actions', {
                  defaultMessage: 'Actions',
                })}
              </ItemTitleRuleSummary>
              <EuiFlexItem grow={3}>
                {canReadActions ? (
                  <RuleActions
                    ruleActions={rule.actions}
                    actionTypeRegistry={actionTypeRegistry}
                    legacyNotifyWhen={rule.notifyWhen}
                  />
                ) : (
                  <EuiFlexItem>
                    <EuiText size="s">
                      {i18n.translate('xpack.triggersActionsUI.ruleDetails.cannotReadActions', {
                        defaultMessage: 'Connector feature privileges are required to view actions',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                )}
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

// eslint-disable-next-line import/no-default-export
export { RuleDefinition as default };
