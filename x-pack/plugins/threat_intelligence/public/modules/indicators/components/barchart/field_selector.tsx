/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiComboBox } from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import { SecuritySolutionDataViewBase } from '../../../../types';
import { RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { useStyles } from './styles';
import { DROPDOWN_TEST_ID } from './test_ids';
import { COMBOBOX_PREPEND_LABEL } from './translations';

export interface IndicatorsFieldSelectorProps {
  indexPattern: SecuritySolutionDataViewBase;
  valueChange: (value: EuiComboBoxOptionOption<string>) => void;
  defaultStackByValue?: RawIndicatorFieldId;
}

const DEFAULT_STACK_BY_VALUE = RawIndicatorFieldId.Feed;
const COMBOBOX_SINGLE_SELECTION = { asPlainText: true };

export const IndicatorsFieldSelector = memo<IndicatorsFieldSelectorProps>(
  ({ indexPattern, valueChange, defaultStackByValue = DEFAULT_STACK_BY_VALUE }) => {
    const styles = useStyles();
    const defaultStackByValueInfo = indexPattern.fields.find(
      (f: DataViewField) => f.name === defaultStackByValue
    );
    const [selectedField, setSelectedField] = useState<Array<EuiComboBoxOptionOption<string>>>([
      {
        label: defaultStackByValue,
        value: defaultStackByValueInfo?.type,
      },
    ]);
    const fields: Array<EuiComboBoxOptionOption<string>> = useMemo(
      () =>
        indexPattern
          ? indexPattern.fields.map((f: DataViewField) => ({
              label: f.name,
              value: f.type,
            }))
          : [],
      [indexPattern]
    );

    const selectedFieldChange = useCallback(
      (values: Array<EuiComboBoxOptionOption<string>>) => {
        if (values && values.length > 0) {
          valueChange(values[0]);
        }
        setSelectedField(values);
      },
      [valueChange]
    );

    return (
      <EuiComboBox
        css={styles.comboBox}
        data-test-subj={DROPDOWN_TEST_ID}
        prepend={COMBOBOX_PREPEND_LABEL}
        singleSelection={COMBOBOX_SINGLE_SELECTION}
        onChange={selectedFieldChange}
        options={fields}
        selectedOptions={selectedField}
        isClearable={false}
      />
    );
  }
);
