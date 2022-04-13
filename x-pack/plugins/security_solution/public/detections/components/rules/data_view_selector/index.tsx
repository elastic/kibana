/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiFormRow,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { FieldHook } from '../../../../shared_imports';
import * as i18n from './translations';
import { sourcererModel } from '../../../../common/store/sourcerer';

interface DataViewSelectorProps {
  kibanaDataViews: sourcererModel.SourcererDataView[];
  field: FieldHook;
  dataViewId: string;
}
type Event = React.ChangeEvent<HTMLInputElement>;

export const DataViewSelector = ({
  kibanaDataViews = [],
  field,
  dataViewId,
}: DataViewSelectorProps) => {
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    dataViewId != null ? [{ label: dataViewId }] : []
  );
  const onChangeIndexPatterns = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      const dataView = options;

      setSelectedOptions(options);
      field.setValue(dataView[0].label);
    },
    [field]
  );

  // sometimes the form isn't loaded before this component renders
  // so the state of dataViewId changes from the initial state
  // in the parent component to the state pulled from the rule form
  // this makes sure we update the dropdown to display the data view id
  // stored in the rule params when editing the rule.
  useEffect(() => {
    setSelectedOptions([{ label: dataViewId }]);
  }, [dataViewId]);

  // const onChangeIndexPatterns = (options: Array<EuiComboBoxOptionOption<string>>) => {
  //   setSelectedOptions(options);
  // };

  /* kibanaDataViews.map((dataView) => ({ label: dataView.id }))} */

  return (
    <EuiComboBox
      isClearable
      singleSelection={{ asPlainText: true }}
      onChange={onChangeIndexPatterns}
      options={kibanaDataViews.map((dataView) => ({ label: dataView.id }))}
      selectedOptions={selectedOptions}
      aria-label={i18n.PICK_INDEX_PATTERNS}
      placeholder={i18n.PICK_INDEX_PATTERNS}
    />
  );
};
