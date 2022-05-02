/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';

import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import * as i18n from './translations';
import { FetchIndexReturn } from '../../../../common/containers/source';
import { useKibana } from '../../../../common/lib/kibana';

interface DataViewSelectorProps {
  kibanaDataViews: { [x: string]: DataViewListItem };
  field: FieldHook;
  dataViewId?: string;
  useFetchIndex: (
    indexNames: string[],
    onlyCheckIfIndicesExist: boolean,
    onlyWorkWithSearchCallback: boolean
  ) => [boolean, FetchIndexReturn, (indices: string[]) => void];
  setIndexPattern: (indexPattern: DataView) => void;
  setIsIndexPatternLoading: (b: boolean) => void;
}

export const DataViewSelector = ({
  kibanaDataViews,
  field,
  dataViewId,
  useFetchIndex,
  setIndexPattern,
  setIsIndexPatternLoading,
}: DataViewSelectorProps) => {
  const { data } = useKibana().services;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    dataViewId != null && dataViewId.length > 0 ? [{ label: dataViewId }] : []
  );
  const [selectedDataView, setSelectedDataView] = useState<DataViewListItem>();
  const [runtimeMappings, setRuntimeMappings] = useState<MappingRuntimeFields>();
  useEffect(() => {
    const fetchSingleDataView = async () => {
      if (selectedDataView != null) {
        const dv = await data.dataViews.get(selectedDataView.id);
        setIndexPattern(dv);
      }
    };

    fetchSingleDataView();
  }, [data.dataViews, selectedDataView, setIndexPattern]);
  const onChangeIndexPatterns = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      const dataView = options;

      setSelectedOptions(options);
      setSelectedDataView(kibanaDataViews[dataView[0].label]);
      field.setValue(dataView[0].label);
    },
    [field, kibanaDataViews]
  );

  // sometimes the form isn't loaded before this component renders
  // so the state of dataViewId changes from the initial state
  // in the parent component to the state pulled from the rule form
  // this makes sure we update the dropdown to display the data view id
  // stored in the rule params when editing the rule.
  useEffect(() => {
    if (dataViewId != null && dataViewId.length > 0) setSelectedOptions([{ label: dataViewId }]);
  }, [dataViewId]);

  // const onChangeIndexPatterns = (options: Array<EuiComboBoxOptionOption<string>>) => {
  //   setSelectedOptions(options);
  // };

  /* kibanaDataViews.map((dataView) => ({ label: dataView.id }))} */

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
    >
      <EuiComboBox
        isClearable
        singleSelection={{ asPlainText: true }}
        onChange={onChangeIndexPatterns}
        // TODO: optimize this, pass down array of data view ids
        // at the same time we grab the data views in the top level form component
        options={Object.keys(kibanaDataViews).map((dvId) => ({
          label: dvId,
          id: dvId,
        }))}
        selectedOptions={selectedOptions}
        aria-label={i18n.PICK_INDEX_PATTERNS}
        placeholder={i18n.PICK_INDEX_PATTERNS}
        data-test-subj="detectionsDataViewSelectorDropdown"
      />
    </EuiFormRow>
  );
};
