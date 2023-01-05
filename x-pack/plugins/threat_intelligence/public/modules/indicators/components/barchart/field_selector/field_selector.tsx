/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import { SecuritySolutionDataViewBase } from '../../../../../types';
import { RawIndicatorFieldId } from '../../../../../../common/types/indicator';
import { useStyles } from './styles';

export const DROPDOWN_TEST_ID = 'tiIndicatorFieldSelectorDropdown';

export interface IndicatorsFieldSelectorProps {
  indexPattern: SecuritySolutionDataViewBase;
  valueChange: (value: string) => void;
  defaultStackByValue?: RawIndicatorFieldId;
}

const DEFAULT_STACK_BY_VALUE = RawIndicatorFieldId.Feed;
const COMBOBOX_PREPEND_LABEL = i18n.translate(
  'xpack.threatIntelligence.indicator.fieldSelector.label',
  {
    defaultMessage: 'Stack by',
  }
);
const COMBOBOX_SINGLE_SELECTION = { asPlainText: true };

export const IndicatorsFieldSelector = memo<IndicatorsFieldSelectorProps>(
  ({ indexPattern, valueChange, defaultStackByValue = DEFAULT_STACK_BY_VALUE }) => {
    const styles = useStyles();

    const [selectedField, setSelectedField] = useState<Array<EuiComboBoxOptionOption<string>>>([
      {
        label: defaultStackByValue,
      },
    ]);

    const fields: Array<EuiComboBoxOptionOption<string>> = useMemo(
      () =>
        indexPattern
          ? indexPattern.fields.map((f: DataViewField) => ({
              label: f.name,
            }))
          : [],
      [indexPattern]
    );

    const selectedFieldChange = useCallback(
      (values: Array<EuiComboBoxOptionOption<string>>) => {
        if (values && values.length > 0) {
          valueChange(values[0].label);
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
