/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiPopoverTitle } from '@elastic/eui';
import { StatusRuleCondition } from '../../../../../../common/rules/status_rule';
import { PopoverExpression } from './popover_expression';
import { StatusRuleParamsProps } from '../status_rule_ui';

interface Props {
  ruleParams: StatusRuleParamsProps['ruleParams'];
  setRuleParams: StatusRuleParamsProps['setRuleParams'];
}

export const LocationsValueExpression = ({ ruleParams, setRuleParams }: Props) => {
  const { condition } = ruleParams;

  const onLocationCountChange = useCallback(
    (value: number) => {
      setRuleParams('condition', {
        ...ruleParams.condition,
        window: {
          ...ruleParams.condition?.window,
          numberOfLocations: value,
        },
        groupBy: value === 1 ? ruleParams.condition?.groupBy : 'none',
      } as StatusRuleCondition);
    },
    [ruleParams.condition, setRuleParams]
  );

  const numberOfLocations =
    condition && 'numberOfLocations' in condition.window
      ? condition.window.numberOfLocations ?? 1
      : 1;
  return (
    <PopoverExpression
      value={i18n.translate('xpack.synthetics.windowValueExpression.percentLabel', {
        defaultMessage:
          '{numberOfLocations} {numberOfLocations, plural, one {location} other {locations}}',
        values: { numberOfLocations: numberOfLocations ?? 1 },
      })}
    >
      <EuiPopoverTitle>
        {i18n.translate('xpack.synthetics.windowValueExpression.numberOfLocPopoverTitleLabel', {
          defaultMessage: 'Number of locations',
        })}
      </EuiPopoverTitle>
      <EuiFieldNumber
        data-test-subj="syntheticsWindowValueExpressionFieldNumber"
        min={1}
        max={100}
        compressed
        value={numberOfLocations}
        onChange={(evt) => onLocationCountChange(Number(evt.target.value))}
      />
    </PopoverExpression>
  );
};
