/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { GroupByOptions } from '../../../../../../../../detections/pages/detection_engine/rules/types';
import { DurationInput } from '../../../../../../../rule_creation_ui/components/duration_input';
import { UseMultiFields } from '../../../../../../../../shared_imports';
import {
  SUPPRESSION_DURATION,
  SUPPRESSION_DURATION_SELECTOR,
  SUPPRESSION_DURATION_UNIT,
  SUPPRESSION_DURATION_VALUE,
} from './form_schema';
import * as i18n from './translations';

interface AlertSuppressionDurationProps {
  disabled?: boolean;
}

export function SuppressionDurationSelector({
  disabled,
}: AlertSuppressionDurationProps): JSX.Element {
  return (
    <EuiFormRow data-test-subj="alertSuppressionDuration">
      <UseMultiFields<{
        suppressionDurationSelector: string;
        suppressionDurationValue: number | undefined;
        suppressionDurationUnit: string;
      }>
        fields={{
          suppressionDurationSelector: {
            path: SUPPRESSION_DURATION_SELECTOR,
          },
          suppressionDurationValue: {
            path: `${SUPPRESSION_DURATION}.${SUPPRESSION_DURATION_VALUE}`,
          },
          suppressionDurationUnit: {
            path: `${SUPPRESSION_DURATION}.${SUPPRESSION_DURATION_UNIT}`,
          },
        }}
      >
        {({ suppressionDurationSelector, suppressionDurationValue, suppressionDurationUnit }) => (
          <EuiRadioGroup
            disabled={disabled}
            idSelected={suppressionDurationSelector.value}
            options={[
              {
                id: GroupByOptions.PerRuleExecution,
                label: i18n.ALERT_SUPPRESSION_DURATION_PER_RULE_EXECUTION_OPTION,
              },
              {
                id: GroupByOptions.PerTimePeriod,
                disabled,
                label: (
                  <>
                    {i18n.ALERT_SUPPRESSION_DURATION_PER_TIME_PERIOD_OPTION}
                    <DurationInput
                      data-test-subj="alertSuppressionDurationInput"
                      durationValueField={suppressionDurationValue}
                      durationUnitField={suppressionDurationUnit}
                      // Suppression duration is also disabled suppression by rule execution is selected in radio button
                      isDisabled={
                        disabled ||
                        suppressionDurationSelector.value !== GroupByOptions.PerTimePeriod
                      }
                      minimumValue={1}
                    />
                  </>
                ),
              },
            ]}
            onChange={(id) => {
              suppressionDurationSelector.setValue(id);
            }}
            data-test-subj="groupByDurationOptions"
          />
        )}
      </UseMultiFields>
    </EuiFormRow>
  );
}
