/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useUpdateEffect } from 'react-use';
import { CreateTransformWizardContext } from '../../../../wizard/wizard';
import { commonFilterAggs, filterAggsFieldSupport } from '../constants';
import { IndexPattern } from '../../../../../../../../../../../../src/plugins/data/public';
import { getFilterAggTypeConfig } from '../config';
import { FilterAggType, PivotAggsConfigFilter } from '../types';

/**
 * Resolves supported filters for provided field.
 */
export function getSupportedFilterAggs(
  fieldName: string,
  indexPattern: IndexPattern
): FilterAggType[] {
  const field = indexPattern.fields.getByName(fieldName);

  if (field === undefined) {
    throw new Error(`The field ${fieldName} does not exist in the index`);
  }

  return [...commonFilterAggs, ...filterAggsFieldSupport[field.type]];
}

/**
 * Component for filter aggregation related controls.
 *
 * Responsible for the filter agg type selection and rendering of
 * the corresponded field set.
 */
export const FilterAggForm: PivotAggsConfigFilter['AggFormComponent'] = ({
  aggConfig,
  onChange,
  selectedField,
}) => {
  const { indexPattern } = useContext(CreateTransformWizardContext);

  const filterAggsOptions = useMemo(() => getSupportedFilterAggs(selectedField, indexPattern!), [
    indexPattern,
    selectedField,
  ]);

  useUpdateEffect(() => {
    // reset filter agg on field change
    onChange({});
  }, [selectedField]);

  const filterAggTypeConfig = aggConfig?.aggTypeConfig;
  const filterAgg = aggConfig?.filterAgg ?? '';

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.transform.agg.popoverForm.filerAggLabel"
            defaultMessage="Filter query"
          />
        }
      >
        <EuiSelect
          options={[{ text: '', value: '' }].concat(
            filterAggsOptions.map((v) => ({ text: v, value: v }))
          )}
          value={filterAgg}
          onChange={(e) => {
            // have to reset aggTypeConfig of filterAgg change
            const filterAggUpdate = e.target.value as FilterAggType;
            onChange({
              filterAgg: filterAggUpdate,
              aggTypeConfig: getFilterAggTypeConfig(filterAggUpdate),
            });
          }}
          data-test-subj="transformFilterAggTypeSelector"
        />
      </EuiFormRow>
      {filterAgg !== '' && filterAggTypeConfig?.FilterAggFormComponent && (
        <filterAggTypeConfig.FilterAggFormComponent
          config={filterAggTypeConfig?.filterAggConfig}
          onChange={(update: any) => {
            onChange({
              ...aggConfig,
              aggTypeConfig: {
                ...filterAggTypeConfig,
                filterAggConfig: update.config,
              },
            });
          }}
          selectedField={selectedField}
        />
      )}
    </>
  );
};
