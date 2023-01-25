/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { useFieldStatsTrigger } from '../../../../../utils/use_field_stats_trigger';
import { Field } from '../../../../../../../../../common/types/fields';

interface DropDownLabel {
  label: string;
  field: Field;
}

interface Props {
  fields: Field[];
  changeHandler(i: Field | null): void;
  selectedField: Field | null;
}

export const GeoFieldSelect: FC<Props> = ({ fields, changeHandler, selectedField }) => {
  const { renderOption, optionCss } = useFieldStatsTrigger();

  const options: EuiComboBoxOptionOption[] = useMemo(
    () =>
      fields.map(
        (f) =>
          ({
            label: f.name,
            field: f,
            css: optionCss,
          } as DropDownLabel)
      ),
    [fields, optionCss]
  );

  const selection: EuiComboBoxOptionOption[] = useMemo(() => {
    const selectedOptions: EuiComboBoxOptionOption[] = [];
    if (selectedField !== null) {
      selectedOptions.push({ label: selectedField.name, field: selectedField } as DropDownLabel);
    }
    return selectedOptions;
  }, [selectedField]);

  const onChange = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) => {
      const option = selectedOptions[0] as DropDownLabel;
      if (typeof option !== 'undefined') {
        changeHandler(option.field);
      } else {
        changeHandler(null);
      }
    },
    [changeHandler]
  );

  return (
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={true}
      data-test-subj="mlGeoFieldNameSelect"
      renderOption={renderOption}
    />
  );
};
