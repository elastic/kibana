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
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useEffect, useState } from 'react';
import { useFieldNames } from './useFieldNames';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { useUiTracker } from '../../../../../observability/public';

interface Props {
  fieldNames: string[];
  setFieldNames: (fieldNames: string[]) => void;
  setDurationPercentile?: (value: PercentileOption) => void;
  showThreshold?: boolean;
  durationPercentile?: PercentileOption;
}

export type PercentileOption = 50 | 75 | 99;
const percentilOptions: PercentileOption[] = [50, 75, 99];

export function CustomFields({
  fieldNames,
  setFieldNames,
  setDurationPercentile = () => {},
  showThreshold = false,
  durationPercentile = 75,
}: Props) {
  const trackApmEvent = useUiTracker({ app: 'apm' });
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
              helpText="Default threshold is 75th percentile."
            >
              <EuiSelect
                value={durationPercentile}
                options={percentilOptions.map((percentile) => ({
                  value: percentile,
                  text: i18n.translate(
                    'xpack.apm.correlations.customize.thresholdPercentile',
                    {
                      defaultMessage: '{percentile}th percentile',
                      values: { percentile },
                    }
                  ),
                }))}
                onChange={(e) => {
                  setDurationPercentile(
                    parseInt(e.target.value, 10) as PercentileOption
                  );
                }}
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
                trackApmEvent({ metric: 'customize_correlations_fields' });
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
