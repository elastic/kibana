/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiSelect, EuiButtonGroup, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { PivotAggsConfigTopMetrics } from '../types';
import { PivotConfigurationContext } from '../../../../pivot_configuration/pivot_configuration';
import {
  isSpecialSortField,
  KbnNumericType,
  NUMERIC_TYPES_OPTIONS,
  SORT_DIRECTION,
  SORT_MODE,
  SortDirection,
  SortMode,
  SortNumericFieldType,
  TOP_METRICS_SORT_FIELD_TYPES,
  TOP_METRICS_SPECIAL_SORT_FIELDS,
} from '../../../../../../../common/pivot_aggs';

export const TopMetricsAggForm: PivotAggsConfigTopMetrics['AggFormComponent'] = ({
  onChange,
  aggConfig,
}) => {
  const {
    state: { fields },
  } = useContext(PivotConfigurationContext)!;

  const sortFieldOptions = fields
    .filter((v) => TOP_METRICS_SORT_FIELD_TYPES.includes(v.type))
    .map(({ name }) => ({ text: name, value: name }));

  Object.values(TOP_METRICS_SPECIAL_SORT_FIELDS).forEach((v) => {
    sortFieldOptions.unshift({ text: v, value: v });
  });
  sortFieldOptions.unshift({ text: '', value: '' });

  const isSpecialFieldSelected = isSpecialSortField(aggConfig.sortField);

  const sortDirectionOptions = Object.values(SORT_DIRECTION).map((v) => ({
    id: v,
    label: v,
  }));

  const sortModeOptions = Object.values(SORT_MODE).map((v) => ({
    id: v,
    label: v,
  }));

  const sortFieldType = fields.find((f) => f.name === aggConfig.sortField)?.type;

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.transform.agg.popoverForm.sortFieldTopMetricsLabel"
            defaultMessage="Sort field"
          />
        }
      >
        <EuiSelect
          options={sortFieldOptions}
          value={aggConfig.sortField}
          onChange={(e) => {
            onChange({ ...aggConfig, sortField: e.target.value });
          }}
          data-test-subj="transformSortFieldTopMetricsLabel"
        />
      </EuiFormRow>

      {aggConfig.sortField ? (
        <>
          {isSpecialFieldSelected ? null : (
            <>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.transform.agg.popoverForm.sortDirectionTopMetricsLabel"
                    defaultMessage="Sort direction"
                  />
                }
              >
                <EuiButtonGroup
                  type="single"
                  legend={i18n.translate(
                    'xpack.transform.agg.popoverForm.sortDirectionTopMetricsLabel',
                    {
                      defaultMessage: 'Sort direction',
                    }
                  )}
                  options={sortDirectionOptions}
                  idSelected={aggConfig.sortDirection ?? ''}
                  onChange={(id: string) =>
                    onChange({ ...aggConfig, sortDirection: id as SortDirection })
                  }
                  color="text"
                />
              </EuiFormRow>

              <EuiSpacer size="s" />

              <EuiAccordion
                id="sortAdvancedSettings"
                buttonContent={
                  <FormattedMessage
                    id="xpack.transform.agg.popoverForm.advancedSortingSettingsLabel"
                    defaultMessage="Advanced sorting settings"
                  />
                }
              >
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.transform.agg.popoverForm.sortModeTopMetricsLabel"
                      defaultMessage="Sort mode"
                    />
                  }
                  helpText={
                    <FormattedMessage
                      id="xpack.transform.agg.popoverForm.sortModeTopMetricsHelpText"
                      defaultMessage="Only relevant if the sorting field is an array."
                    />
                  }
                >
                  <EuiButtonGroup
                    type="single"
                    legend={i18n.translate(
                      'xpack.transform.agg.popoverForm.sortModeTopMetricsLabel',
                      {
                        defaultMessage: 'Sort mode',
                      }
                    )}
                    options={sortModeOptions}
                    idSelected={aggConfig.sortMode ?? ''}
                    onChange={(id: string) => {
                      onChange({ ...aggConfig, sortMode: id as SortMode });
                    }}
                    color="text"
                  />
                </EuiFormRow>

                {sortFieldType && NUMERIC_TYPES_OPTIONS.hasOwnProperty(sortFieldType) ? (
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.transform.agg.popoverForm.numericSortFieldTopMetricsLabel"
                        defaultMessage="Numeric field"
                      />
                    }
                  >
                    <EuiSelect
                      options={NUMERIC_TYPES_OPTIONS[sortFieldType as KbnNumericType].map((v) => ({
                        text: v,
                        name: v,
                      }))}
                      value={aggConfig.numericType}
                      onChange={(e) => {
                        onChange({
                          ...aggConfig,
                          numericType: e.target.value as SortNumericFieldType,
                        });
                      }}
                      data-test-subj="transformSortNumericTypeTopMetricsLabel"
                    />
                  </EuiFormRow>
                ) : null}
              </EuiAccordion>
            </>
          )}
        </>
      ) : null}
    </>
  );
};
