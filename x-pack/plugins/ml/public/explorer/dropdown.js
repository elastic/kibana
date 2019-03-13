/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';

import React, { useReducer } from 'react';

import {
  EuiComboBox,
  EuiSpacer,
} from '@elastic/eui';

import { List } from './list';

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

export const actions = {
  'ADD_ITEM': 'addItem',
  'DELETE_ITEM': 'deleteItem',
};

export function createAddAction(dispatch) {
  return (d) => dispatch({ type: actions.ADD_ITEM, payload: d[0].label });
}

export function createDeleteAction(dispatch) {
  return (payload) => dispatch({ type: actions.DELETE_ITEM, payload });
}

export const initialState = {
  list: [],
  selectedOptions: [],
};

export function reducer(state, action) {
  switch(action.type) {
    case actions.ADD_ITEM:
      return {
        ...state,
        list: uniq([ ...state.list, action.payload])
      };
    case actions.DELETE_ITEM:
      return {
        ...state,
        list: state.list.filter(l => l !== action.payload)
      };
  }
}

export const DropDown = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { list, selectedOptions } = state;

  const addAction = createAddAction(dispatch);
  const deleteAction = createDeleteAction(dispatch);

  return (
    <div style={{ textAlign: 'left' }}>
      <h3>Aggregations</h3>
      {list.length > 0 && (
        <EuiSpacer size="l" />
      )}
      <List
        list={list}
        optionsData={optionsData}
        deleteHandler={deleteAction}
      />
      <EuiSpacer size="l" />
      <EuiComboBox
        placeholder="Add an aggregation ..."
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={addAction}
        isClearable={false}
      />
    </div>
  );
};
