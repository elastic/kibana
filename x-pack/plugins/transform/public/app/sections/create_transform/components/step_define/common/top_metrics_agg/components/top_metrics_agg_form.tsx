/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSelect, EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { PivotAggsConfigTopMetrics, TopMetricsAggConfig } from '../types';
import {
  isSpecialSortField,
  SORT_DIRECTION,
  SortDirection,
  TOP_METRICS_SORT_FIELD_TYPES,
  TOP_METRICS_SPECIAL_SORT_FIELDS,
} from '../../../../../../../common/pivot_aggs';
import { useWizardContext } from '../../../../wizard/wizard';
import { getPivotDropdownOptions } from '../../get_pivot_dropdown_options';
import { useWizardSelector } from '../../../../../state_management/create_transform_store';

export const TopMetricsAggForm: PivotAggsConfigTopMetrics['AggFormComponent'] = ({
  onChange,
  aggConfig,
}) => {
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);

  const { fields } = useMemo(
    () => getPivotDropdownOptions(dataView, runtimeMappings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runtimeMappings]
  );

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

  const sortSettings = aggConfig.sortSettings ?? {};

  const updateSortSettings = useCallback(
    (update: Partial<TopMetricsAggConfig['sortSettings']>) => {
      onChange({
        ...aggConfig,
        sortSettings: {
          ...(aggConfig.sortSettings ?? {}),
          ...update,
        },
      });
    },
    [aggConfig, onChange]
  );

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
                  idSelected={sortSettings.order ?? ''}
                  onChange={(id: string) => {
                    updateSortSettings({ order: id as SortDirection });
                  }}
                  color="text"
                />
              </EuiFormRow>

              <EuiSpacer size="s" />
            </>
          )}
        </>
      ) : null}
    </>
  );
};
