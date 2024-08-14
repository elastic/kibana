/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiExpression, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { getConditionType, StatusRuleCondition } from '../../../../../../common/rules/status_rule';
import { StatusRuleParamsProps } from '../status_rule_ui';

interface Props {
  ruleParams: StatusRuleParamsProps['ruleParams'];
  setRuleParams: StatusRuleParamsProps['setRuleParams'];
}

export const WITHIN_TOTAL_CHECKS_LABEL = i18n.translate(
  'xpack.synthetics.monitorStatusRule.withinTotalChecks.label',
  {
    defaultMessage: 'Within total checks',
  }
);

export const WITHIN_TOTAL_CHECKS_EXPRESSION = i18n.translate(
  'xpack.synthetics.monitorStatusRule.withinTotalChecks.expression',
  {
    defaultMessage: 'Within the last',
  }
);

export const WITHIN_TIMERANGE_EXPRESSION = i18n.translate(
  'xpack.synthetics.monitorStatusRule.withinTimerange.expression',
  {
    defaultMessage: 'Within the last',
  }
);

export const WITHIN_TIMERANGE_LABEL = i18n.translate(
  'xpack.synthetics.monitorStatusRule.withinTimerange.label',
  {
    defaultMessage: 'Within timerange',
  }
);

export const FROM_LOCATIONS_LABEL = i18n.translate(
  'xpack.synthetics.monitorStatusRule.fromLocations.label',
  {
    defaultMessage: 'From locations',
  }
);

export const FROM_LOCATIONS_EXPRESSION = i18n.translate(
  'xpack.synthetics.forTheLastExpression.fromLocationsPopoverLabel',
  {
    defaultMessage: 'From',
  }
);

interface Option {
  expression: string;
  label: string;
  key: 'checksWindow' | 'timeWindow' | 'locations';
}

const OPTIONS: Option[] = [
  {
    label: WITHIN_TOTAL_CHECKS_LABEL,
    key: 'checksWindow',
  },
  {
    label: WITHIN_TIMERANGE_LABEL,
    key: 'timeWindow',
  },
  {
    label: FROM_LOCATIONS_LABEL,
    key: 'locations',
  },
];

export const DEFAULT_CONDITION: StatusRuleCondition = {
  window: { numberOfChecks: 5 },
  groupByLocation: true,
  downThreshold: 5,
};
const getCheckedOption = (option: Option, condition?: StatusRuleCondition) => {
  const { isTimeWindow, isLocationBased } = getConditionType(condition);

  if (isLocationBased && option.key === 'locations') {
    return 'on';
  }

  if (option.key === 'timeWindow' && isTimeWindow && !isLocationBased) {
    return 'on';
  }
  if (option.key === 'checksWindow' && !isTimeWindow && !isLocationBased) {
    return 'on';
  }

  return undefined;
};

export const ForTheLastExpression = ({ ruleParams, setRuleParams }: Props) => {
  const { condition } = ruleParams;

  const { isTimeWindow, isLocationBased } = getConditionType(condition);

  const [isOpen, setIsOpen] = useState(false);

  const [options, setOptions] = useState<Option[]>(OPTIONS);

  useEffect(() => {
    if (!condition) {
      setRuleParams('condition', DEFAULT_CONDITION);
    }
  }, [condition, setRuleParams]);

  useEffect(() => {
    setOptions(
      OPTIONS.map((option) => ({
        key: option.key as 'checksWindow' | 'timeWindow',
        label: option.label,
        checked: getCheckedOption(option, condition),
      }))
    );
  }, [condition, isTimeWindow]);

  return (
    <EuiPopover
      id="checkPopover"
      panelPaddingSize="s"
      button={
        <EuiExpression
          description={
            isLocationBased
              ? FROM_LOCATIONS_EXPRESSION
              : isTimeWindow
              ? WITHIN_TIMERANGE_EXPRESSION
              : WITHIN_TOTAL_CHECKS_EXPRESSION
          }
          isActive={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
    >
      <EuiSelectable<Option>
        singleSelection="always"
        options={options}
        onChange={(selectedValues) => {
          const selectedValue = selectedValues.filter((v) => v.checked === 'on')?.[0];
          switch (selectedValue?.key) {
            case 'checksWindow':
              setRuleParams('condition', {
                ...ruleParams.condition,
                downThreshold: 5,
                window: { numberOfChecks: 5 },
              });
              break;
            case 'timeWindow':
              setRuleParams('condition', {
                ...ruleParams.condition,
                downThreshold: 5,
                window: { time: { unit: 'm', size: 5 } },
              });
              break;
            case 'locations':
              setRuleParams('condition', {
                ...ruleParams.condition,
                downThreshold: 1,
                window: { percentOfLocations: 100 },
              });
              break;
            default:
              break;
          }
        }}
      >
        {(list) => (
          <div style={{ width: 240 }}>
            <EuiPopoverTitle>
              {i18n.translate('xpack.synthetics.forTheLastExpression.whenPopoverTitleLabel', {
                defaultMessage: 'When',
              })}
            </EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
