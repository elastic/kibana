/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { fromExpression } from '@kbn/interpreter/common';
import { TimePicker } from '../time_picker';
import { TimePickerMini } from '../time_picker_mini';

function getFilterMeta(filter) {
  const ast = fromExpression(filter);
  const column = get(ast, 'chain[0].arguments.column[0]');
  const from = get(ast, 'chain[0].arguments.from[0]');
  const to = get(ast, 'chain[0].arguments.to[0]');
  return { column, from, to };
}

export const TimeFilter = ({ filter, commit, compact }) => {
  const setFilter = column => (from, to) => {
    commit(`timefilter from="${from}" to=${to} column=${column}`);
  };

  const { column, from, to } = getFilterMeta(filter);

  if (compact) {
    return <TimePickerMini from={from} to={to} onSelect={setFilter(column)} />;
  } else {
    return <TimePicker from={from} to={to} onSelect={setFilter(column)} />;
  }
};

TimeFilter.propTypes = {
  filter: PropTypes.string,
  commit: PropTypes.func, // Canvas filter
  compact: PropTypes.bool,
};
