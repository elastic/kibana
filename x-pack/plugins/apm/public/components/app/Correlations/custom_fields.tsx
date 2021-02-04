/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiComboBox,
  EuiFormRow,
  EuiLink,
  EuiFieldNumber,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  fieldNames: string[];
  defaultFieldNames: string[];
  setFieldNames: (fieldNames: string[]) => void;
  setDurationPercentile?: (value: number) => void;
  showThreshold?: boolean;
  durationPercentile?: number;
}

export function CustomFields({
  fieldNames,
  setFieldNames,
  defaultFieldNames,
  setDurationPercentile = () => {},
  showThreshold = false,
  durationPercentile = 50,
}: Props) {
  return (
    <EuiAccordion
      id="accordion"
      buttonContent={i18n.translate(
        'xpack.apm.correlations.customize.buttonLabel',
        { defaultMessage: 'Customize fields' }
      )}
    >
      <EuiFlexGroup>
        {showThreshold && (
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={i18n.translate(
                'xpack.apm.correlations.customize.thresholdLabel',
                { defaultMessage: 'Threshold' }
              )}
              helpText="Target percentile"
            >
              <EuiFieldNumber
                value={durationPercentile.toString(10)}
                onChange={(e) => {
                  const value = parseInt(e.currentTarget.value, 10);
                  if (isValidPercentile(value)) {
                    setDurationPercentile(value);
                  }
                }}
                prepend="%"
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={4}>
          <EuiFormRow
            fullWidth={true}
            label={i18n.translate(
              'xpack.apm.correlations.customize.fieldLabel',
              {
                defaultMessage: 'Field',
              }
            )}
            helpText={
              <>
                {i18n.translate(
                  'xpack.apm.correlations.customize.fieldHelpText',
                  {
                    defaultMessage: 'Fields to analyse for correlations.',
                  }
                )}
                &nbsp;
                <EuiLink
                  type="reset"
                  onClick={() => {
                    setFieldNames(defaultFieldNames);
                  }}
                >
                  {i18n.translate(
                    'xpack.apm.correlations.customize.fieldResetDefault',
                    { defaultMessage: 'Reset to default' }
                  )}
                </EuiLink>
              </>
            }
          >
            <EuiComboBox
              fullWidth={true}
              placeholder={i18n.translate(
                'xpack.apm.correlations.customize.fieldPlaceholder',
                { defaultMessage: 'Select or create options' }
              )}
              selectedOptions={fieldNames.map((label) => ({ label }))}
              onChange={(options) => {
                const nextFieldNames = options.map((option) => option.label);
                setFieldNames(nextFieldNames);
              }}
              onCreateOption={(term) => {
                const nextFieldNames = [...fieldNames, term];
                setFieldNames(nextFieldNames);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
}

function isValidPercentile(value: number) {
  return !isNaN(value) && value >= 0 && value <= 100;
}
