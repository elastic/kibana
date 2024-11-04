/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRadioGroup, EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash';
import { UseMultiFields } from '../../../../shared_imports';
import { AlertSuppressionDurationType } from '../../../../detections/pages/detection_engine/rules/types';
import { DurationInput } from '../duration_input';
import {
  ALERT_SUPPRESSION_DURATION,
  ALERT_SUPPRESSION_DURATION_TYPE,
  ALERT_SUPPRESSION_DURATION_UNIT,
  ALERT_SUPPRESSION_DURATION_VALUE,
} from './fields';
import * as i18n from './translations';

interface AlertSuppressionDurationProps {
  disabled?: boolean;
}

export function ThresholdSuppressionDurationSelector({
  disabled,
}: AlertSuppressionDurationProps): JSX.Element {
  return (
    <EuiFormRow data-test-subj="alertSuppressionDuration">
      <UseMultiFields<{
        suppressionDurationType: string;
        suppressionDurationValue: number | undefined;
        suppressionDurationUnit: string;
      }>
        fields={{
          suppressionDurationType: {
            path: ALERT_SUPPRESSION_DURATION_TYPE,
            defaultValue: AlertSuppressionDurationType.PerTimePeriod,
          },
          suppressionDurationValue: {
            path: `${ALERT_SUPPRESSION_DURATION}.${ALERT_SUPPRESSION_DURATION_VALUE}`,
          },
          suppressionDurationUnit: {
            path: `${ALERT_SUPPRESSION_DURATION}.${ALERT_SUPPRESSION_DURATION_UNIT}`,
          },
        }}
      >
        {({ suppressionDurationValue, suppressionDurationUnit }) => (
          <EuiRadioGroup
            disabled={disabled}
            idSelected={AlertSuppressionDurationType.PerTimePeriod}
            options={[
              {
                id: AlertSuppressionDurationType.PerRuleExecution,
                label: (
                  <EuiToolTip content={i18n.THRESHOLD_SUPPRESSION_PER_RULE_EXECUTION_WARNING}>
                    <> {i18n.ALERT_SUPPRESSION_DURATION_PER_RULE_EXECUTION_OPTION}</>
                  </EuiToolTip>
                ),
                disabled: true,
              },
              {
                id: AlertSuppressionDurationType.PerTimePeriod,
                disabled,
                label: (
                  <>
                    {i18n.ALERT_SUPPRESSION_DURATION_PER_TIME_PERIOD_OPTION}
                    <DurationInput
                      data-test-subj="alertSuppressionDurationInput"
                      durationValueField={suppressionDurationValue}
                      durationUnitField={suppressionDurationUnit}
                      isDisabled={disabled ?? false}
                      minimumValue={1}
                    />
                  </>
                ),
              },
            ]}
            onChange={noop}
            data-test-subj="alertSuppressionDurationOptions"
          />
        )}
      </UseMultiFields>
    </EuiFormRow>
  );
}
