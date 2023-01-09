/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
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
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { RuleNotifyWhenType, RuleAction } from '../../../types';
import { DEFAULT_FREQUENCY } from '../../../common/constants';

const DEFAULT_NOTIFY_WHEN_VALUE: RuleNotifyWhenType = 'onActionGroupChange';

export const NOTIFY_WHEN_OPTIONS: Array<EuiSuperSelectOption<RuleNotifyWhenType>> = [
  {
    value: 'onActionGroupChange',
    inputDisplay: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onActionGroupChange.display',
      {
        defaultMessage: 'On status changes',
      }
    ),
    'data-test-subj': 'onActionGroupChange',
    dropdownDisplay: (
      <>
        <strong>
          <FormattedMessage
            defaultMessage="On status changes"
            id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onActionGroupChange.label"
          />
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              defaultMessage="Actions run if the alert status changes."
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
        defaultMessage: 'On check intervals',
      }
    ),
    'data-test-subj': 'onActiveAlert',
    dropdownDisplay: (
      <>
        <strong>
          <FormattedMessage
            defaultMessage="On check intervals"
            id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onActiveAlert.label"
          />
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              defaultMessage="Actions run if rule conditions are met."
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
        defaultMessage: 'On custom action intervals',
      }
    ),
    'data-test-subj': 'onThrottleInterval',
    dropdownDisplay: (
      <>
        <strong>
          <FormattedMessage
            defaultMessage="On custom action intervals"
            id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onThrottleInterval.label"
          />
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              defaultMessage="Actions run if rule conditions are met."
              id="xpack.triggersActionsUI.sections.ruleForm.ruleNotifyWhen.onThrottleInterval.description"
            />
          </p>
        </EuiText>
      </>
    ),
  },
];

interface RuleNotifyWhenProps {
  frequency: RuleAction['frequency'];
  throttle: number | null;
  throttleUnit: string;
  onNotifyWhenChange: (notifyWhen: RuleNotifyWhenType) => void;
  onThrottleChange: (throttle: number | null, throttleUnit: string) => void;
}

export const ActionNotifyWhen = ({
  frequency = DEFAULT_FREQUENCY,
  throttle,
  throttleUnit,
  onNotifyWhenChange,
  onThrottleChange,
}: RuleNotifyWhenProps) => {
  const [showCustomThrottleOpts, setShowCustomThrottleOpts] = useState<boolean>(false);
  const [notifyWhenValue, setNotifyWhenValue] =
    useState<RuleNotifyWhenType>(DEFAULT_NOTIFY_WHEN_VALUE);

  useEffect(() => {
    if (frequency.notifyWhen) {
      setNotifyWhenValue(frequency.notifyWhen);
    } else {
      // If 'notifyWhen' is not set, derive value from existence of throttle value
      setNotifyWhenValue(frequency.throttle ? RuleNotifyWhen.THROTTLE : RuleNotifyWhen.ACTIVE);
    }
  }, [frequency]);

  useEffect(() => {
    setShowCustomThrottleOpts(notifyWhenValue === 'onThrottleInterval');
  }, [notifyWhenValue]);

  const onNotifyWhenValueChange = useCallback(
    (newValue: RuleNotifyWhenType) => {
      onNotifyWhenChange(newValue);
      setNotifyWhenValue(newValue);
      // Calling onNotifyWhenChange and onThrottleChange at the same time interferes with the React state lifecycle
      // so wait for onNotifyWhenChange to process before calling onThrottleChange
      setTimeout(
        () =>
          onThrottleChange(newValue === 'onThrottleInterval' ? throttle ?? 1 : null, throttleUnit),
        100
      );
    },
    [onNotifyWhenChange, setNotifyWhenValue, onThrottleChange, throttle, throttleUnit]
  );

  const labelForRuleRenotify = [
    i18n.translate('xpack.triggersActionsUI.sections.ruleForm.renotifyFieldLabel', {
      defaultMessage: 'Notify',
    }),
    <EuiIconTip
      position="right"
      type="questionInCircle"
      content={i18n.translate('xpack.triggersActionsUI.sections.ruleForm.renotifyWithTooltip', {
        defaultMessage: 'Define how often alerts generate actions.',
      })}
    />,
  ];

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiSuperSelect
            fullWidth
            prepend={labelForRuleRenotify}
            data-test-subj="notifyWhenSelect"
            options={NOTIFY_WHEN_OPTIONS}
            valueOfSelected={notifyWhenValue}
            onChange={onNotifyWhenValueChange}
          />
          {showCustomThrottleOpts && (
            <>
              <EuiSpacer size="xs" />
              <EuiFormRow fullWidth>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={2}>
                    <EuiFieldNumber
                      min={1}
                      value={throttle ?? 1}
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
                            onThrottleChange(value, throttleUnit);
                          })
                        );
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={3}>
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
    </>
  );
};
