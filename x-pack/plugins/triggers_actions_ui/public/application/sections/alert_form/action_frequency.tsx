/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiFlexGrid,
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
import { InitialAlert } from './alert_reducer';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import {
  getDurationNumberInItsUnit,
  getDurationUnitValue,
} from '../../../../../alerts/common/parse_duration';

type ActionFreqencyType = 'notifyOnlyOnActionGroupChange' | 'throttleNull' | 'throttleCustom';

type ActionFrequencyOptionsType = {
  description: string;
  formatOpts: (throttle: number | null, throttleUnit: string) => ActionFrequencyOpts;
} & EuiSuperSelectOption<ActionFreqencyType>;

const ActionFrequencyOptions: ActionFrequencyOptionsType[] = [
  {
    value: 'notifyOnlyOnActionGroupChange',
    inputDisplay: 'Run only on status change',
    description: 'Actions will run when the alert status changes.',
    formatOpts: () => ({
      throttle: null,
      notifyOnlyOnActionGroupChange: true,
    }),
  },
  {
    value: 'throttleNull',
    inputDisplay: 'Run every time alert is active',
    description: 'Actions will run with every active alert execution.',
    formatOpts: () => ({
      throttle: null,
      notifyOnlyOnActionGroupChange: false,
    }),
  },
  {
    value: 'throttleCustom',
    inputDisplay: 'Set a custom action interval',
    description: 'Set a custom interval for the actions to run when the alert is active.',
    formatOpts: (throttle: number | null, throttleUnit: string) => ({
      throttle: throttle!,
      throttleUnit,
      notifyOnlyOnActionGroupChange: false,
    }),
  },
];

const DEFAULT_ACTION_FREQUENCY_VALUE: ActionFreqencyType = 'notifyOnlyOnActionGroupChange';

const ACTION_FREQUENCY_OPTIONS: Array<
  EuiSuperSelectOption<ActionFreqencyType>
> = ActionFrequencyOptions.map(
  ({ value, inputDisplay, description }: ActionFrequencyOptionsType) => ({
    value,
    inputDisplay,
    'data-test-subj': value,
    dropdownDisplay: (
      <Fragment>
        <strong>
          <FormattedMessage
            defaultMessage={`${inputDisplay}`}
            id={`xpack.triggersActionsUI.sections.alertForm.actionFrequency.${value}.label`}
          />
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              defaultMessage={`${description}`}
              id={`xpack.triggersActionsUI.sections.alertForm.actionFrequency.${value}.description`}
            />
          </p>
        </EuiText>
      </Fragment>
    ),
  })
);

export interface ActionFrequencyOpts {
  throttle: number | null;
  throttleUnit?: string;
  notifyOnlyOnActionGroupChange: boolean;
}

interface ActionFrequencyFormProps {
  alert: InitialAlert;
  throttle: number | null;
  throttleUnit: string;
  onActionFreqencyChange: (opts: ActionFrequencyOpts) => void;
  onThrottleChange: (throttle: number | null, throttleUnit: string) => void;
  onThrottleUnitChange: (throttleUnit: string) => void;
}

export const ActionFrequencyForm = ({
  alert,
  onActionFreqencyChange,
  onThrottleChange,
  onThrottleUnitChange,
}: ActionFrequencyFormProps) => {
  const [alertThrottle, setAlertThrottle] = useState<number | null>(null);
  const [alertThrottleUnit, setAlertThrottleUnit] = useState<string>('m');
  const [showCustomActionFrequencyOpts, setShowCustomActionFrequencyOpts] = useState<boolean>(
    false
  );
  const [actionFrequencyValue, setActionFrequencyValue] = useState<ActionFreqencyType>(
    DEFAULT_ACTION_FREQUENCY_VALUE
  );

  useEffect(() => {
    setActionFrequencyValue(
      alert.notifyOnlyOnActionGroupChange
        ? 'notifyOnlyOnActionGroupChange'
        : alert.throttle
        ? 'throttleCustom'
        : 'throttleNull'
    );

    if (!alert.throttle) {
      setAlertThrottle(
        alert.schedule.interval ? getDurationNumberInItsUnit(alert.schedule.interval) : null
      );
      setAlertThrottleUnit(
        alert.schedule.interval ? getDurationUnitValue(alert.schedule.interval) : 'm'
      );
    } else {
      setAlertThrottle(alert.throttle ? getDurationNumberInItsUnit(alert.throttle) : null);
      setAlertThrottleUnit(alert.throttle ? getDurationUnitValue(alert.throttle) : 'm');
    }
  }, [alert]);

  useEffect(() => {
    setShowCustomActionFrequencyOpts(actionFrequencyValue === 'throttleCustom');
  }, [actionFrequencyValue]);

  const onActionFrequencyValueChange = useCallback((newValue: ActionFreqencyType) => {
    const type = ActionFrequencyOptions.find(
      (opt: ActionFrequencyOptionsType) => opt.value === newValue
    );
    if (type) {
      onActionFreqencyChange(type.formatOpts(alertThrottle, alertThrottleUnit));
      setActionFrequencyValue(newValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <EuiFlexGrid columns={1}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h1>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertForm.actionFrequency.title"
                defaultMessage="Action Frequency"
              />
            </h1>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertForm.actionFrequency.description"
              defaultMessage="Choose how often the actions should run when the alert is active."
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSuperSelect
            data-test-subj="actionFrequencySelect"
            options={ACTION_FREQUENCY_OPTIONS}
            valueOfSelected={actionFrequencyValue}
            onChange={onActionFrequencyValueChange}
          />
          {showCustomActionFrequencyOpts && (
            <Fragment>
              <EuiSpacer />
              <EuiFormRow fullWidth>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem>
                    <EuiFieldNumber
                      fullWidth
                      min={1}
                      compressed
                      value={alertThrottle || ''}
                      name="throttle"
                      data-test-subj="throttleInput"
                      prepend={i18n.translate(
                        'xpack.triggersActionsUI.sections.alertForm.actionFrequency.label',
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
                            setAlertThrottle(value);
                            onThrottleChange(value, alertThrottleUnit);
                          })
                        );
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      compressed
                      data-test-subj="throttleUnitInput"
                      value={alertThrottleUnit}
                      options={getTimeOptions(alertThrottle ?? 1)}
                      onChange={(e) => {
                        setAlertThrottleUnit(e.target.value);
                        onThrottleUnitChange(e.target.value);
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            </Fragment>
          )}
        </EuiFlexItem>
      </EuiFlexGrid>
    </Fragment>
  );
};
