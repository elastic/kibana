/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut, EuiComboBox, EuiFormRow, EuiSpacer } from '@elastic/eui';

import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import * as i18n from './translations';
import type { DefineStepRule } from '../../../pages/detection_engine/rules/types';

export interface DataViewSelectorProps {
  kibanaDataViews: Record<string, DataViewListItem>;
  field: FieldHook<DefineStepRule['dataViewId']>;
}

export const DataViewSelector = ({ kibanaDataViews, field }: DataViewSelectorProps) => {
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

  const [showDataViewAlertsOnAlertsWarning, setShowDataViewAlertsOnAlertsWarning] = useState(false);

  useEffect(() => {
    if (!selectedDataViewNotFound && dataViewId) {
      const dataViewsTitle = kibanaDataViews[dataViewId].title;
      const dataViewsId = kibanaDataViews[dataViewId].id;

      setShowDataViewAlertsOnAlertsWarning(dataViewsId === 'security-solution-default');

      setSelectedOption([{ id: dataViewsId, label: dataViewsTitle }]);
    } else {
      setSelectedOption([]);
    }
  }, [
    dataViewId,
    field,
    kibanaDataViews,
    selectedDataViewNotFound,
    setShowDataViewAlertsOnAlertsWarning,
  ]);

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
