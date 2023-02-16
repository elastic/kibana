/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiText,
  EuiSpacer,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiPopover,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { some, filter, map } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { RuleNotifyWhenType, RuleAction } from '../../../types';
import { DEFAULT_FREQUENCY } from '../../../common/constants';

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

interface ActionNotifyWhenProps {
  frequency: RuleAction['frequency'];
  throttle: number | null;
  throttleUnit: string;
  onNotifyWhenChange: (notifyWhen: RuleNotifyWhenType) => void;
  onThrottleChange: (throttle: number | null, throttleUnit: string) => void;
  onSummaryChange: (summary: boolean) => void;
  hasSummary?: boolean;
  showMinimumThrottleWarning?: boolean;
  showMinimumThrottleUnitWarning?: boolean;
}

export const ActionNotifyWhen = ({
  hasSummary,
  frequency = DEFAULT_FREQUENCY,
  throttle,
  throttleUnit,
  onNotifyWhenChange,
  onThrottleChange,
  onSummaryChange,
  showMinimumThrottleWarning,
  showMinimumThrottleUnitWarning,
}: ActionNotifyWhenProps) => {
  const [showCustomThrottleOpts, setShowCustomThrottleOpts] = useState<boolean>(false);
  const [notifyWhenValue, setNotifyWhenValue] = useState<RuleNotifyWhenType>(
    DEFAULT_FREQUENCY.notifyWhen
  );

  const [summaryMenuOpen, setSummaryMenuOpen] = useState(false);

  useEffect(() => {
    if (frequency.notifyWhen) {
      setNotifyWhenValue(frequency.notifyWhen);
    } else {
      // If 'notifyWhen' is not set, derive value from existence of throttle value
      setNotifyWhenValue(frequency.throttle ? RuleNotifyWhen.THROTTLE : RuleNotifyWhen.ACTIVE);
    }
  }, [frequency]);

  useEffect(() => {
    setShowCustomThrottleOpts(notifyWhenValue === RuleNotifyWhen.THROTTLE);
  }, [notifyWhenValue]);

  const onNotifyWhenValueChange = useCallback(
    (newValue: RuleNotifyWhenType) => {
      onNotifyWhenChange(newValue);
      setNotifyWhenValue(newValue);
      // Calling onNotifyWhenChange and onThrottleChange at the same time interferes with the React state lifecycle
      // so wait for onNotifyWhenChange to process before calling onThrottleChange
      setTimeout(
        () =>
          onThrottleChange(
            newValue === RuleNotifyWhen.THROTTLE ? throttle ?? 1 : null,
            throttleUnit
          ),
        100
      );
    },
    [onNotifyWhenChange, onThrottleChange, throttle, throttleUnit]
  );

  const selectSummaryOption = useCallback(
    (summary: boolean) => {
      onSummaryChange(summary);
      setSummaryMenuOpen(false);
      if (summary && frequency.notifyWhen === RuleNotifyWhen.CHANGE) {
        onNotifyWhenChange(RuleNotifyWhen.ACTIVE);
      }
    },
    [onSummaryChange, frequency.notifyWhen, onNotifyWhenChange]
  );

  const summaryOptions = useMemo(
    () => [
      <SummaryContextMenuOption
        className="euiSuperSelect__item"
        key="summary"
        onClick={() => selectSummaryOption(true)}
        icon={frequency.summary ? 'check' : 'empty'}
        id="actionNotifyWhen-option-summary"
      >
        {SUMMARY_OF_ALERTS}
      </SummaryContextMenuOption>,
      <SummaryContextMenuOption
        className="euiSuperSelect__item"
        key="for_each"
        onClick={() => selectSummaryOption(false)}
        icon={!frequency.summary ? 'check' : 'empty'}
        id="actionNotifyWhen-option-for_each"
      >
        {FOR_EACH_ALERT}
      </SummaryContextMenuOption>,
    ],
    [frequency.summary, selectSummaryOption]
  );

  const summaryOrPerRuleSelect = (
    <EuiPopover
      data-test-subj="summaryOrPerRuleSelect"
      initialFocus={`#actionNotifyWhen-option-${frequency.summary ? 'summary' : 'for_each'}`}
      isOpen={summaryMenuOpen}
      closePopover={useCallback(() => setSummaryMenuOpen(false), [setSummaryMenuOpen])}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      aria-label={frequency.summary ? SUMMARY_OF_ALERTS : FOR_EACH_ALERT}
      aria-roledescription={i18n.translate(
        'xpack.triggersActionsUI.sections.ruleForm.actionNotifyWhen.summaryOrRulePerSelectRoleDescription',
        { defaultMessage: 'Action frequency type select' }
      )}
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="arrowDown"
          iconSide="right"
          onClick={useCallback(() => setSummaryMenuOpen(!summaryMenuOpen), [summaryMenuOpen])}
        >
          {frequency.summary ? SUMMARY_OF_ALERTS : FOR_EACH_ALERT}
        </EuiButtonEmpty>
      }
    >
      <EuiContextMenuPanel items={summaryOptions} />
    </EuiPopover>
  );

  const notifyWhenOptions = useMemo(
    () =>
      frequency.summary
        ? NOTIFY_WHEN_OPTIONS.filter((o) => o.value !== RuleNotifyWhen.CHANGE)
        : NOTIFY_WHEN_OPTIONS,
    [frequency.summary]
  );

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate(
        'xpack.triggersActionsUI.sections.ruleForm.actionNotifyWhen.actionFrequencyLabel',
        { defaultMessage: 'Action frequency' }
      )}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiSuperSelect
            fullWidth
            prepend={hasSummary ? summaryOrPerRuleSelect : <></>}
            data-test-subj="notifyWhenSelect"
            options={notifyWhenOptions}
            valueOfSelected={notifyWhenValue}
            onChange={onNotifyWhenValueChange}
          />
          {showCustomThrottleOpts && (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow fullWidth>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem style={{ flexGrow: 0.1 }} />
                  <EuiFlexItem grow={2}>
                    <EuiFieldNumber
                      isInvalid={showMinimumThrottleWarning}
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
                      isInvalid={showMinimumThrottleUnitWarning}
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
              {(showMinimumThrottleWarning || showMinimumThrottleUnitWarning) && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="danger">
                    {i18n.translate(
                      'xpack.triggersActionsUI.sections.actionTypeForm.notifyWhenThrottleWarning',
                      {
                        defaultMessage:
                          "Custom action intervals cannot be shorter than the rule's check interval",
                      }
                    )}
                  </EuiText>
                </>
              )}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

const FOR_EACH_ALERT = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.actionNotifyWhen.forEachOption',
  { defaultMessage: 'For each alert' }
);
const SUMMARY_OF_ALERTS = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.actionNotifyWhen.summaryOption',
  { defaultMessage: 'Summary of alerts' }
);

const SummaryContextMenuOption = euiStyled(EuiContextMenuItem)`
  min-width: 300px;
`;
