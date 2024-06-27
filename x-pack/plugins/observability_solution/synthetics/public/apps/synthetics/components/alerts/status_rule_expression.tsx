/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiExpression,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
  EuiIconTip,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { ValueExpression } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { GroupByExpression } from './common/group_by_field';
import { WindowValueExpression } from './common/condition_window_value';
import { DEFAULT_CONDITION, ForTheLastExpression } from './common/for _the_last_expression';
import { StatusRuleParamsProps } from './status_rule_ui';

interface Props {
  ruleParams: StatusRuleParamsProps['ruleParams'];
  setRuleParams: StatusRuleParamsProps['setRuleParams'];
}

export const StatusRuleExpression: React.FC<Props> = ({ ruleParams, setRuleParams }) => {
  const condition = ruleParams.condition;
  const downThreshold =
    condition && 'downThreshold' in condition ? condition.downThreshold ?? 5 : 5;
  const locBased = (condition && 'percentOfLocations' in condition.window) ?? false;

  const onThresholdChange = useCallback(
    (value: number) => {
      const prevCondition = ruleParams.condition ?? {
        downThreshold: 5,
        window: {
          numberOfChecks: 5,
        },
      };
      setRuleParams('condition', {
        ...prevCondition,
        downThreshold: value,
      });
    },
    [ruleParams.condition, setRuleParams]
  );

  const onGroupByChange = useCallback(
    (value: boolean) => {
      setRuleParams('condition', {
        ...(ruleParams?.condition ?? DEFAULT_CONDITION),
        groupByLocation: value,
      });
    },
    [ruleParams?.condition, setRuleParams]
  );

  return (
    <>
      <EuiHorizontalRule size="half" margin="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.synthetics.rules.status.condition.title', {
                defaultMessage: 'Condition',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content="Monitor alerts are always grouped by monitor ID." position="right" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiExpression
            aria-label={StatusTranslations.criteriaAriaLabel}
            color="success"
            description={StatusTranslations.criteriaDescription}
            value={StatusTranslations.criteriaValue}
          />
        </EuiFlexItem>
        {!locBased ? (
          <EuiFlexItem grow={false}>
            <ValueExpression
              value={downThreshold}
              valueLabel={i18n.translate('xpack.synthetics.rules.status.valueLabel', {
                defaultMessage: '{threshold} times',
                values: { threshold: downThreshold },
              })}
              onChangeSelectedValue={(val) => {
                onThresholdChange(val);
              }}
              description={StatusTranslations.isDownDescription}
              errors={[]}
            />
          </EuiFlexItem>
        ) : (
          <EuiExpression description={StatusTranslations.isDownDescription} />
        )}
        <EuiFlexItem grow={false}>
          <ForTheLastExpression ruleParams={ruleParams} setRuleParams={setRuleParams} />
        </EuiFlexItem>
        <EuiFlexItem>
          <WindowValueExpression ruleParams={ruleParams} setRuleParams={setRuleParams} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {!locBased && (
        <GroupByExpression
          groupByLocation={ruleParams.condition?.groupByLocation ?? true}
          onChange={onGroupByChange}
        />
      )}
      <EuiSpacer size="l" />
    </>
  );
};

export const StatusTranslations = {
  criteriaAriaLabel: i18n.translate('xpack.synthetics.rules.status.criteriaExpression.ariaLabel', {
    defaultMessage:
      'An expression displaying the criteria for the monitors that are being watched by this alert',
  }),
  criteriaDescription: i18n.translate(
    'xpack.synthetics.alerts.tls.criteriaExpression.description',
    {
      defaultMessage: 'when',
    }
  ),
  criteriaValue: i18n.translate('xpack.synthetics.status.criteriaExpression.value', {
    defaultMessage: 'monitor',
  }),
  isDownDescription: i18n.translate('xpack.synthetics.status.expirationExpression.description', {
    defaultMessage: 'is down ',
  }),
};
