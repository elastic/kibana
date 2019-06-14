/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useRef, useState } from 'react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiSpacer,
  EuiFieldNumber,
  EuiSelect,
  EuiComboBox,
  EuiComboBoxOptionProps,
} from '@elastic/eui';

import { Field, Aggregation, FieldId, AggId } from '../../../../../../common/types/fields';

// The display label used for an aggregation e.g. sum(bytes).
export type Label = string;

// Label object structured for EUI's ComboBox.
export interface DropDownLabel {
  label: Label;
  agg: Aggregation;
  field: Field;
}

// Label object structure for EUI's ComboBox with support for nesting.
export interface DropDownOption {
  label: Label;
  options: DropDownLabel[];
}
// interface AggOption extends EuiComboBoxOptionProps {
//   agg: Aggregation;
//   field: Field;
// }

interface Props {
  fields: Field[];
  aggs: Aggregation[];
  changeHandler(d: EuiComboBoxOptionProps[]): void;
  selectedOptions: EuiComboBoxOptionProps[];
}

export const AggSelect: FC<Props> = ({ fields, aggs, changeHandler, selectedOptions }) => {
  const options: EuiComboBoxOptionProps[] = fields.map(f => {
    const aggOption: DropDownOption = { label: f.name, options: [] };
    if (typeof f.aggs !== 'undefined') {
      aggOption.options = f.aggs.map(a => ({
        label: `${a.title}(${f.name})`,
        agg: a,
        field: f,
      }));
    }
    return aggOption;
  });

  return (
    <Fragment>
      <EuiComboBox
        // placeholder={placeholder}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={changeHandler}
        isClearable={false}
      />
    </Fragment>
  );
};
