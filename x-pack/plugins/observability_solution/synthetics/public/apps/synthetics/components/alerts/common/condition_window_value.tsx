/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ForLastExpression, TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiPopoverTitle } from '@elastic/eui';
import { PopoverExpression } from './popover_expression';
import { getConditionType, TimeWindow } from '../../../../../../common/rules/status_rule';
import { StatusRuleParamsProps } from '../status_rule_ui';

interface Props {
  ruleParams: StatusRuleParamsProps['ruleParams'];
  setRuleParams: StatusRuleParamsProps['setRuleParams'];
}

export const WindowValueExpression = ({ ruleParams, setRuleParams }: Props) => {
  const { condition } = ruleParams;
  const timeWindow =
    condition && 'time' in condition.window
      ? condition.window.time ?? {
          size: 5,
          unit: 'm',
        }
      : null;

  const timeWindowSize = timeWindow?.size ?? 5;
  const timeWindowUnit = timeWindow?.unit ?? 'm';

  const numberOfChecks =
    condition && 'numberOfChecks' in condition.window ? condition.window.numberOfChecks : null;

  const { useTimeWindow } = getConditionType(ruleParams.condition);

  const onTimeWindowChange = useCallback(
    (value: TimeWindow) => {
      setRuleParams('condition', {
        ...ruleParams.condition,
        window: {
          ...ruleParams.condition?.window,
          time: value,
        },
      });
    },
    [ruleParams.condition, setRuleParams]
  );

  const onNumberOfChecksChange = useCallback(
    (value: number) => {
      setRuleParams('condition', {
        ...ruleParams.condition,
        window: {
          ...ruleParams.condition?.window,
          numberOfChecks: value,
        },
      });
    },
    [ruleParams.condition, setRuleParams]
  );

  if (!useTimeWindow) {
    return (
      <PopoverExpression
        value={
          (numberOfChecks ?? 5) +
          i18n.translate('xpack.synthetics.windowValueExpression.checksLabel', {
            defaultMessage: ' checks',
          })
        }
      >
        <EuiPopoverTitle>
          {i18n.translate(
            'xpack.synthetics.windowValueExpression.numberOfChecksPopoverTitleLabel',
            { defaultMessage: 'Number of checks' }
          )}
        </EuiPopoverTitle>
        <EuiFieldNumber
          data-test-subj="syntheticsWindowValueExpressionFieldNumber"
          min={1}
          max={10}
          compressed
          value={numberOfChecks ?? 5}
          onChange={(evt) => onNumberOfChecksChange(Number(evt.target.value))}
        />
      </PopoverExpression>
    );
  }

  return (
    <ForLastExpression
      timeWindowSize={timeWindowSize}
      timeWindowUnit={timeWindowUnit}
      onChangeWindowSize={(val) => {
        onTimeWindowChange({ size: val ?? 5, unit: timeWindowUnit });
      }}
      onChangeWindowUnit={(val) => {
        onTimeWindowChange({ size: timeWindowSize, unit: (val ?? 'm') as TIME_UNITS });
      }}
      errors={{}}
      description=""
    />
  );
};
