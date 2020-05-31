/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CreateTransformWizardContext } from '../../../../wizard/wizard';
import { filterAggsFieldSupport, FilterAggType, FILTERS } from '../constants';
import { IndexPattern } from '../../../../../../../../../../../../src/plugins/data/public';
import { getFilterAggTypeConfig } from '../config';
import { PivotAggsConfigFilter } from '../types';

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

  return [FILTERS.BOOL, ...filterAggsFieldSupport[field.type]];
}

/**
 * Component for filter aggregation related controls.
 */
export const FilterAggForm: PivotAggsConfigFilter['AggFormComponent'] = ({
  aggConfig,
  onChange,
  selectedField,
}) => {
  const { indexPattern } = useContext(CreateTransformWizardContext);
  const filterAggsOptions = getSupportedFilterAggs(selectedField, indexPattern!);

  const filterAggTypeConfig =
    aggConfig.aggTypeConfig || getFilterAggTypeConfig(aggConfig.filterAgg);

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.transform.agg.popoverForm.filerAggLabel"
            defaultMessage="Filter agg"
          />
        }
      >
        <EuiSelect
          options={[{ text: '', value: '' }].concat(
            filterAggsOptions.map((v) => ({ text: v, value: v }))
          )}
          value={aggConfig.filterAgg}
          onChange={(e) => {
            onChange({
              ...aggConfig,
              // @ts-ignore
              filterAgg: e.target.value,
            });
          }}
        />
      </EuiFormRow>
      {aggConfig.filterAgg && (
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
