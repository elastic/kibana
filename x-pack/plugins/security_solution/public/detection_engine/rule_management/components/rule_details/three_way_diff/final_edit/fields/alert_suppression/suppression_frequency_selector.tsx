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
import * as i18n from './translations';

interface AlertSuppressionFrequencyProps {
  disabled?: boolean;
}

export function SuppressionFrequencySelector({
  disabled,
}: AlertSuppressionFrequencyProps): JSX.Element {
  return (
    <EuiFormRow data-test-subj="alertSuppressionDuration">
      <UseMultiFields<{
        groupByRadioSelection: string;
        groupByDurationUnit: string;
        groupByDurationValue: number | undefined;
      }>
        fields={{
          groupByRadioSelection: {
            path: 'groupByRadioSelection',
          },
          groupByDurationValue: {
            path: 'groupByDuration.value',
          },
          groupByDurationUnit: {
            path: 'groupByDuration.unit',
          },
        }}
      >
        {({ groupByRadioSelection, groupByDurationUnit, groupByDurationValue }) => (
          <EuiRadioGroup
            disabled={disabled}
            idSelected={groupByRadioSelection.value}
            options={[
              {
                id: GroupByOptions.PerRuleExecution,
                label: i18n.ALERT_SUPPRESSION_PER_RULE_EXECUTION,
              },
              {
                id: GroupByOptions.PerTimePeriod,
                disabled,
                label: (
                  <>
                    {i18n.ALERT_SUPPRESSION_PER_TIME_PERIOD}
                    <DurationInput
                      data-test-subj="alertSuppressionDurationInput"
                      durationValueField={groupByDurationValue}
                      durationUnitField={groupByDurationUnit}
                      // Suppression duration is also disabled suppression by rule execution is selected in radio button
                      isDisabled={
                        disabled || groupByRadioSelection.value !== GroupByOptions.PerTimePeriod
                      }
                      minimumValue={1}
                    />
                  </>
                ),
              },
            ]}
            onChange={(id) => {
              groupByRadioSelection.setValue(id);
            }}
            data-test-subj="groupByDurationOptions"
          />
        )}
      </UseMultiFields>
    </EuiFormRow>
  );
}
