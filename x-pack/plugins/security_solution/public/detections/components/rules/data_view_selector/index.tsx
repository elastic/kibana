/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
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
}
type Event = React.ChangeEvent<HTMLInputElement>;

export const DataViewSelector = ({ kibanaDataViews = [], field }: DataViewSelectorProps) => {
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const onChangeIndexPatterns = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      const dataView = options;

      setSelectedOptions(options);
      field.setValue(dataView[0].label);
    },
    [field]
  );

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
