/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';

import React, { Component } from 'react';

import {
  EuiComboBox,
  EuiSpacer,
} from '@elastic/eui';

import List from './list';

const getOptions = () => {
  const aggs = ['sum', 'avg', 'median', 'value_count', 'min', 'max', ].sort();
  const fields = ['rating', 'age', 'influence', 'comments'].sort();

  const options = [];
  const optionsData = {};

  fields.forEach((field) => {
    const o = { label: field, options: [] };
    aggs.forEach((agg) => {
      const label = `${agg}(${field})`;
      o.options.push({ label });
      const formRowLabel = `${agg}_${field}`;
      optionsData[label] = { agg, field, formRowLabel };
    });
    options.push(o);
  });

  return { options, optionsData };
};

class DropDown extends Component {
  constructor(props) {
    super(props);

    const { options, optionsData } = getOptions();
    this.options = options;
    this.optionsData = optionsData;

    this.state = {
      list: [],
      selectedOptions: [],
    };
  }

  deleteHandler = (d) => {
    console.warn('outer delete', d);
    const list = this.state.list.filter(l => l !== d);
    this.setState({ list });
  }

  addHandler = (selectedOptions) => {
    // We should only get back either 0 or 1 options.
    console.warn('selectedOptions', selectedOptions);
    const list = uniq([ ...this.state.list, selectedOptions[0].label]);
    this.setState({ list });
  };

  render() {
    const { list, selectedOptions } = this.state;
    console.warn('list', list);

    return (
      <div style={{ textAlign: 'left' }}>
        <h3>Aggregations</h3>
        {list.length > 0 && (
          <EuiSpacer size="l" />
        )}
        <List list={list} optionsData={this.optionsData} deleteHandler={this.deleteHandler} />
        <EuiSpacer size="l" />
        <EuiComboBox
          placeholder="Enter an aggregation ..."
          singleSelection={{ asPlainText: true }}
          options={this.options}
          selectedOptions={selectedOptions}
          onChange={this.addHandler}
          isClearable={false}
        />
      </div>
    );
  }
}

export { DropDown };
