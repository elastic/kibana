/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import { EuiFormRow, EuiIcon, EuiSelect, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import { CreateTransformWizardContext } from '../../../../wizard/wizard';
import { commonFilterAggs, filterAggsFieldSupport } from '../constants';
import { getFilterAggTypeConfig } from '../config';
import type { FilterAggType, PivotAggsConfigFilter } from '../types';
import { getKibanaFieldTypeFromEsType } from '../../get_pivot_dropdown_options';

/**
 * Resolves supported filters for provided field.
 */
export function getSupportedFilterAggs(
  fieldName: string,
  dataView: DataView,
  runtimeMappings?: RuntimeMappings
): FilterAggType[] | undefined {
  const dataViewField = dataView.fields.getByName(fieldName);

  if (dataViewField !== undefined) {
    return [...commonFilterAggs, ...filterAggsFieldSupport[dataViewField.type]];
  }
  if (isPopulatedObject(runtimeMappings) && Object.hasOwn(runtimeMappings, fieldName)) {
    const runtimeField = runtimeMappings[fieldName];
    return [
      ...commonFilterAggs,
      ...filterAggsFieldSupport[getKibanaFieldTypeFromEsType(runtimeField.type)],
    ];
  }

  // Some aggs like filter boolean might have fields that don't exist
  // but we still support it as JSON
  // eslint-disable-next-line no-console
  console.error(`The field ${fieldName} does not exist in the index or runtime fields`);
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
  const { dataView, runtimeMappings } = useContext(CreateTransformWizardContext);

  const filterAggsOptions = useMemo(
    () => getSupportedFilterAggs(selectedField, dataView!, runtimeMappings),
    [dataView, selectedField, runtimeMappings]
  );

  useUpdateEffect(
    function resetConfigOnFieldChange() {
      // reset filter agg on field change
      onChange({});
    },
    [selectedField]
  );

  const filterAggTypeConfig = aggConfig?.aggTypeConfig;
  const filterAgg = aggConfig?.filterAgg ?? '';
  const isValid = filterAggTypeConfig?.isValid ? filterAggTypeConfig?.isValid() : undefined;
  return (
    <>
      {filterAggsOptions !== undefined ? (
        <EuiFormRow
          label={
            <>
              <FormattedMessage
                id="xpack.transform.agg.popoverForm.filerAggLabel"
                defaultMessage="Filter query"
              />
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.transform.agg.popoverForm.filerQueryAdvancedSuggestionTooltip"
                    defaultMessage="To add other filter query aggregations, edit the JSON config."
                  />
                }
              >
                <EuiIcon
                  size="s"
                  color="subdued"
                  type="questionInCircle"
                  className="eui-alignTop"
                />
              </EuiToolTip>
            </>
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
                aggTypeConfig: getFilterAggTypeConfig(filterAggUpdate, selectedField),
              });
            }}
            data-test-subj="transformFilterAggTypeSelector"
          />
        </EuiFormRow>
      ) : null}
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
          isValid={isValid}
        />
      )}
    </>
  );
};
