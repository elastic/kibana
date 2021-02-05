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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useEffect, useState } from 'react';
import { useFieldNames } from './useFieldNames';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';

interface Props {
  fieldNames: string[];
  setFieldNames: (fieldNames: string[]) => void;
  setDurationPercentile?: (value: number) => void;
  showThreshold?: boolean;
  durationPercentile?: number;
}

export function CustomFields({
  fieldNames,
  setFieldNames,
  setDurationPercentile = () => {},
  showThreshold = false,
  durationPercentile = 50,
}: Props) {
  const { defaultFieldNames, getSuggestions } = useFieldNames();
  const [suggestedFieldNames, setSuggestedFieldNames] = useState(
    getSuggestions('')
  );

  useEffect(() => {
    if (suggestedFieldNames.length) {
      return;
    }
    setSuggestedFieldNames(getSuggestions(''));
  }, [getSuggestions, suggestedFieldNames]);

  return (
    <EuiAccordion
      id="accordion"
      buttonContent={i18n.translate(
        'xpack.apm.correlations.customize.buttonLabel',
        { defaultMessage: 'Customize fields' }
      )}
    >
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        {showThreshold && (
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={i18n.translate(
                'xpack.apm.correlations.customize.thresholdLabel',
                { defaultMessage: 'Threshold' }
              )}
              helpText="Default threshold is 50th percentile."
            >
              <EuiFieldNumber
                value={durationPercentile.toString(10)}
                onChange={(e) => {
                  const value = parseInt(e.currentTarget.value, 10);
                  if (isValidPercentile(value)) {
                    setDurationPercentile(value);
                  }
                }}
                prepend="Percentile"
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiFormRow
            fullWidth={true}
            label={i18n.translate(
              'xpack.apm.correlations.customize.fieldLabel',
              { defaultMessage: 'Field' }
            )}
            helpText={
              <FormattedMessage
                id="xpack.apm.correlations.customize.fieldHelpText"
                defaultMessage="Customize or {reset} fields to analyze for correlations. {docsLink}"
                values={{
                  reset: (
                    <EuiLink
                      type="reset"
                      onClick={() => {
                        setFieldNames(defaultFieldNames);
                      }}
                    >
                      {i18n.translate(
                        'xpack.apm.correlations.customize.fieldHelpTextReset',
                        { defaultMessage: 'reset' }
                      )}
                    </EuiLink>
                  ),
                  docsLink: (
                    <ElasticDocsLink
                      section="/kibana"
                      path="/advanced-queries.html"
                    >
                      {i18n.translate(
                        'xpack.apm.correlations.customize.fieldHelpTextDocsLink',
                        {
                          defaultMessage:
                            'Learn more about the default fields.',
                        }
                      )}
                    </ElasticDocsLink>
                  ),
                }}
              />
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
              onSearchChange={(searchValue) => {
                setSuggestedFieldNames(getSuggestions(searchValue));
              }}
              options={suggestedFieldNames.map((label) => ({ label }))}
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
