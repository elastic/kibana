/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';

import {
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';

import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { DataViewBase } from '@kbn/es-query';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';

interface DataViewSelectorProps {
  kibanaDataViews: { [x: string]: DataViewListItem };
  field: FieldHook<DefineStepRule['dataViewId']>;
  setIndexPattern: (indexPattern: DataViewBase) => void;
}

export const DataViewSelector = ({
  kibanaDataViews,
  field,
  setIndexPattern,
}: DataViewSelectorProps) => {
  const { data } = useKibana().services;

  let isInvalid;
  let errorMessage;
  let dataViewId: string | null | undefined;
  if (field != null) {
    const fieldAndError = getFieldValidityAndErrorMessage(field);
    isInvalid = fieldAndError.isInvalid;
    errorMessage = fieldAndError.errorMessage;
    dataViewId = field.value;
  }

  const kibanaDataViewsDefined = useMemo(
    () => kibanaDataViews != null && Object.keys(kibanaDataViews).length > 0,
    [kibanaDataViews]
  );

  // Most likely case here is that a data view of an existing rule was deleted
  // and can no longer be found
  const selectedDataViewNotFound = useMemo(
    () =>
      dataViewId != null &&
      dataViewId !== '' &&
      kibanaDataViewsDefined &&
      !Object.hasOwn(kibanaDataViews, dataViewId),
    [kibanaDataViewsDefined, dataViewId, kibanaDataViews]
  );
  const [selectedOption, setSelectedOption] = useState<Array<EuiComboBoxOptionOption<string>>>(
    !selectedDataViewNotFound && dataViewId != null && dataViewId !== ''
      ? [{ id: kibanaDataViews[dataViewId].id, label: kibanaDataViews[dataViewId].title }]
      : []
  );

  const [selectedDataView, setSelectedDataView] = useState<DataViewListItem>();

  // TODO: optimize this, pass down array of data view ids
  // at the same time we grab the data views in the top level form component
  const dataViewOptions = useMemo(() => {
    return kibanaDataViewsDefined
      ? Object.values(kibanaDataViews).map((dv) => ({
          label: dv.title,
          id: dv.id,
        }))
      : [];
  }, [kibanaDataViewsDefined, kibanaDataViews]);

  useEffect(() => {
    const fetchSingleDataView = async () => {
      if (selectedDataView != null) {
        const dv = await data.dataViews.get(selectedDataView.id);
        setIndexPattern(dv);
      }
    };

    fetchSingleDataView();
  }, [data.dataViews, selectedDataView, setIndexPattern]);

  const onChangeDataViews = (options: Array<EuiComboBoxOptionOption<string>>) => {
    const selectedDataViewOption = options;

    setSelectedOption(selectedDataViewOption ?? []);

    if (
      selectedDataViewOption != null &&
      selectedDataViewOption.length > 0 &&
      selectedDataViewOption[0].id != null
    ) {
      setSelectedDataView(kibanaDataViews[selectedDataViewOption[0].id]);
      field?.setValue(selectedDataViewOption[0].id);
    } else {
      setSelectedDataView(undefined);
      field?.setValue(undefined);
    }
  };

  return (
    <>
      {selectedDataViewNotFound && dataViewId != null && (
        <>
          <EuiCallOut
            title={i18n.DATA_VIEW_NOT_FOUND_WARNING_LABEL}
            color="warning"
            iconType="help"
          >
            <p>{i18n.DATA_VIEW_NOT_FOUND_WARNING_DESCRIPTION(dataViewId)}</p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFormRow
        label={field?.label}
        helpText={field?.helpText}
        error={errorMessage}
        isInvalid={isInvalid}
        data-test-subj="pick-rule-data-source"
      >
        <EuiComboBox
          isClearable
          singleSelection={{ asPlainText: true }}
          onChange={onChangeDataViews}
          options={dataViewOptions}
          selectedOptions={selectedOption}
          aria-label={i18n.PICK_INDEX_PATTERNS}
          placeholder={i18n.PICK_INDEX_PATTERNS}
          data-test-subj="detectionsDataViewSelectorDropdown"
        />
      </EuiFormRow>
    </>
  );
};
