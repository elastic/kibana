/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';

import React, { useState } from 'react';

import { EuiComboBox, EuiSpacer } from '@elastic/eui';

import { List } from './list';

import { Dictionary } from '../../common/types/common';

interface OptionsDataElement {
  agg: string;
  field: string;
  formRowLabel: string;
}

const aggs = ['sum', 'avg', 'median', 'value_count', 'min', 'max'].sort();
const fields = ['rating', 'age', 'influence', 'comments'].sort();

type Label = string;

interface DropDownLabel {
  label: Label;
}

interface DropDownOption {
  label: string;
  options: DropDownLabel[];
}

const options: DropDownOption[] = [];
const optionsData: Dictionary<OptionsDataElement> = {};

fields.forEach(field => {
  const o: DropDownOption = { label: field, options: [] };
  aggs.forEach(agg => {
    const label = `${agg}(${field})`;
    o.options.push({ label });
    const formRowLabel = `${agg}_${field}`;
    optionsData[label] = { agg, field, formRowLabel };
  });
  options.push(o);
});

export const DropDown = () => {
  const [list, setList] = useState([] as Label[]);

  const addAction = (d: DropDownLabel[]) => {
    const label: Label = d[0].label;
    setList(uniq([...list, label]));
  };

  const deleteAction = (label: Label) => {
    setList(list.filter(l => l !== label));
  };

  return (
    <div style={{ textAlign: 'left' }}>
      <h3>Aggregations</h3>
      {list.length > 0 && <EuiSpacer size="l" />}
      <List list={list} optionsData={optionsData} deleteHandler={deleteAction} />
      <EuiSpacer size="l" />
      <EuiComboBox
        placeholder="Add an aggregation ..."
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={[]}
        onChange={addAction}
        isClearable={false}
      />
    </div>
  );
};
