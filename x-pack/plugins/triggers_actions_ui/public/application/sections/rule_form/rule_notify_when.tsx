/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiText,
  EuiSpacer,
  EuiSuperSelect,
  EuiSuperSelectOption,
} from '@elastic/eui';
import { some, filter, map } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { InitialRule } from './rule_reducer';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { RuleNotifyWhenType } from '../../../types';

const DEFAULT_NOTIFY_WHEN_VALUE: RuleNotifyWhenType = 'onActionGroupChange';

const NOTIFY_WHEN_OPTIONS: Array<EuiSuperSelectOption<RuleNotifyWhenType>> = [
  {
    value: 'onActionGroupChange',
    inputDisplay: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onActionGroupChange.display',
      {
        defaultMessage: 'Only on status change',
      }
    ),
    'data-test-subj': 'onActionGroupChange',
    dropdownDisplay: (
      <>
        <strong>
          <FormattedMessage
            defaultMessage="Only on status change"
            id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onActionGroupChange.label"
          />
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              defaultMessage="Actions run when the rule status changes."
              id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onActionGroupChange.description"
            />
          </p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'onActiveAlert',
    inputDisplay: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onActiveAlert.display',
      {
        defaultMessage: 'Every time rule is active',
      }
    ),
    'data-test-subj': 'onActiveAlert',
    dropdownDisplay: (
      <>
        <strong>
          <FormattedMessage
            defaultMessage="Every time rule is active"
            id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onActiveAlert.label"
          />
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              defaultMessage="Actions repeat at the rule interval when the rule is active."
              id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onActiveAlert.description"
            />
          </p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'onThrottleInterval',
    inputDisplay: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onThrottleInterval.display',
      {
        defaultMessage: 'On a custom action interval',
      }
    ),
    'data-test-subj': 'onThrottleInterval',
    dropdownDisplay: (
      <>
        <strong>
          <FormattedMessage
            defaultMessage="On a custom action interval"
            id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onThrottleInterval.label"
          />
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              defaultMessage="Actions run using the interval you set."
              id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onThrottleInterval.description"
            />
          </p>
        </EuiText>
      </>
    ),
  },
];

interface RuleNotifyWhenProps {
  rule: InitialRule;
  throttle: number | null;
  throttleUnit: string;
  onNotifyWhenChange: (notifyWhen: RuleNotifyWhenType) => void;
  onThrottleChange: (throttle: number | null, throttleUnit: string) => void;
}

export const RuleNotifyWhen = ({
  rule,
  throttle,
  throttleUnit,
  onNotifyWhenChange,
  onThrottleChange,
}: RuleNotifyWhenProps) => {
  const [ruleThrottle, setRuleThrottle] = useState<number>(throttle || 1);
  const [showCustomThrottleOpts, setShowCustomThrottleOpts] = useState<boolean>(false);
  const [notifyWhenValue, setNotifyWhenValue] =
    useState<RuleNotifyWhenType>(DEFAULT_NOTIFY_WHEN_VALUE);

  useEffect(() => {
    if (rule.notifyWhen) {
      setNotifyWhenValue(rule.notifyWhen);
    } else {
      // If 'notifyWhen' is not set, derive value from existence of throttle value
      setNotifyWhenValue(rule.throttle ? 'onThrottleInterval' : 'onActiveAlert');
    }
  }, [rule]);

  useEffect(() => {
    setShowCustomThrottleOpts(notifyWhenValue === 'onThrottleInterval');
  }, [notifyWhenValue]);

  const onNotifyWhenValueChange = useCallback((newValue: RuleNotifyWhenType) => {
    onThrottleChange(newValue === 'onThrottleInterval' ? ruleThrottle : null, throttleUnit);
    onNotifyWhenChange(newValue);
    setNotifyWhenValue(newValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelForRuleRenotify = (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.ruleForm.renotifyFieldLabel"
        defaultMessage="Notify"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.triggersActionsUI.sections.ruleForm.renotifyWithTooltip', {
          defaultMessage: 'Define how often to repeat the action while the rule is active.',
        })}
      />
    </>
  );

  return (
    <>
      <EuiFormRow fullWidth label={labelForRuleRenotify}>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiSuperSelect
              data-test-subj="notifyWhenSelect"
              options={NOTIFY_WHEN_OPTIONS}
              valueOfSelected={notifyWhenValue}
              onChange={onNotifyWhenValueChange}
            />
            {showCustomThrottleOpts && (
              <>
                <EuiSpacer />
                <EuiFormRow fullWidth>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>
                      <EuiFieldNumber
                        fullWidth
                        min={1}
                        value={ruleThrottle}
                        name="throttle"
                        data-test-subj="throttleInput"
                        prepend={i18n.translate(
                          'xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.label',
                          {
                            defaultMessage: 'Every',
                          }
                        )}
                        onChange={(e) => {
                          pipe(
                            some(e.target.value.trim()),
                            filter((value) => value !== ''),
                            map((value) => parseInt(value, 10)),
                            filter((value) => !isNaN(value)),
                            map((value) => {
                              setRuleThrottle(value);
                              onThrottleChange(value, throttleUnit);
                            })
                          );
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSelect
                        data-test-subj="throttleUnitInput"
                        value={throttleUnit}
                        options={getTimeOptions(throttle ?? 1)}
                        onChange={(e) => {
                          onThrottleChange(throttle, e.target.value);
                        }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFormRow>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
};
