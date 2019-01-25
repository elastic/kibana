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

export const TimeFilter = ({ compact, filter, setFilter, commit }) => {
  const ast = fromExpression(filter);

  const from = get(ast, 'chain[0].arguments.from[0]');
  const to = get(ast, 'chain[0].arguments.to[0]');
  const column = get(ast, 'chain[0].arguments.column[0]');

  function doSetFilter(from, to) {
    const filter = `timefilter from="${from}" to=${to} column=${column}`;

    // TODO: Changes to element.filter do not cause a re-render
    setFilter(filter);
    commit(filter);
  }

  if (compact) {
    return <TimePickerMini from={from} to={to} onSelect={doSetFilter} />;
  } else {
    return <TimePicker from={from} to={to} onSelect={doSetFilter} />;
  }
};

TimeFilter.propTypes = {
  filter: PropTypes.string,
  setFilter: PropTypes.func, // Local state
  commit: PropTypes.func, // Canvas filter
  compact: PropTypes.bool,
};
