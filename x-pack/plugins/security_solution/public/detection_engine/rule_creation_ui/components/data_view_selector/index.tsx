/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut, EuiComboBox, EuiFormRow, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { useDataViews } from './use_data_views';
import * as i18n from './translations';

type DataViewId = string | null | undefined;

export interface DataViewSelectorProps {
  field: FieldHook<DefineStepRule['dataViewId']>;
}

export const DataViewSelector = ({ field }: DataViewSelectorProps) => {
  const kibanaDataViews = useDataViews();
  const dataViewId: DataViewId = field?.value;
  const fieldAndError = field ? getFieldValidityAndErrorMessage(field) : undefined;
  const isInvalid = fieldAndError?.isInvalid;
  const errorMessage = fieldAndError?.errorMessage;

  const selectedKibanaDataView = useMemo(() => {
    if (!isDataViewIdValid(dataViewId)) {
      return;
    }

    return kibanaDataViews?.find((x) => x.id === dataViewId);
  }, [dataViewId, kibanaDataViews]);

  const [selectedOption, setSelectedOption] = useState<Array<EuiComboBoxOptionOption<string>>>(
    selectedKibanaDataView
      ? [{ id: selectedKibanaDataView.id, label: selectedKibanaDataView.title }]
      : []
  );
  const [showDataViewAlertsOnAlertsWarning, setShowDataViewAlertsOnAlertsWarning] = useState(false);

  useEffect(() => {
    if (!selectedKibanaDataView) {
      setSelectedOption([]);
      return;
    }

    const dataViewsId = selectedKibanaDataView.id;
    const dataViewsTitle = selectedKibanaDataView.title;

    setShowDataViewAlertsOnAlertsWarning(dataViewsId === 'security-solution-default');
    setSelectedOption([{ id: dataViewsId, label: dataViewsTitle }]);
  }, [selectedKibanaDataView, setShowDataViewAlertsOnAlertsWarning, setSelectedOption]);

  const dataViewOptions = useMemo(() => {
    return (
      kibanaDataViews?.map((kibanaDataView) => ({
        id: kibanaDataView.id,
        label: kibanaDataView.title,
      })) ?? []
    );
  }, [kibanaDataViews]);

  const onChangeDataViews = (options: Array<EuiComboBoxOptionOption<string>>) => {
    const selectedDataViewOption = options;
    setSelectedOption(selectedDataViewOption ?? []);

    if (
      selectedDataViewOption != null &&
      selectedDataViewOption.length > 0 &&
      selectedDataViewOption[0].id != null
    ) {
      const selectedDataViewId = selectedDataViewOption[0].id;
      field?.setValue(selectedDataViewId);
    } else {
      field?.setValue(undefined);
    }
  };

  // Handling the loading state
  if (!kibanaDataViews) {
    return <EuiLoadingSpinner size="l" />;
  }

  return (
    <>
      {Boolean(kibanaDataViews) && !selectedKibanaDataView && isDataViewIdValid(dataViewId) && (
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
      {showDataViewAlertsOnAlertsWarning && (
        <>
          <EuiCallOut
            title={i18n.DDATA_VIEW_ALERTS_ON_ALERTS_WARNING_LABEL}
            color="warning"
            iconType="help"
            data-test-subj="defaultSecurityDataViewWarning"
          >
            <p>{i18n.DATA_VIEW_ALERTS_ON_ALERTS_WARNING_DESCRIPTION}</p>
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

function isDataViewIdValid(dataViewId: DataViewId): dataViewId is string {
  return typeof dataViewId === 'string' && dataViewId !== '';
}
