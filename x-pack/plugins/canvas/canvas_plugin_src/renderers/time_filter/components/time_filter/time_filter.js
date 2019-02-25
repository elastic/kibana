/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { fromExpression } from '@kbn/interpreter/common';
import { TimePicker } from '../time_picker';
import { TimePickerMini } from '../time_picker_mini';

export class TimeFilter extends Component {
  static propTypes = {
    filter: PropTypes.string,
    commit: PropTypes.func, // Canvas filter
    compact: PropTypes.bool,
  };

  state = {
    filter: this.props.filter,
  };

  shouldComponentUpdate(nextProps, nextState) {
    const nextPropsColumn = get(fromExpression(nextProps.filter), 'chain[0].arguments.column[0]');
    const ast = fromExpression(this.state.filter);
    const from = get(ast, 'chain[0].arguments.from[0]');
    const to = get(ast, 'chain[0].arguments.to[0]');
    const column = get(ast, 'chain[0].arguments.column[0]');

    // if the column in the prop filter changes, we need to update the column in state
    // while preserving the date ranges in state
    if (column !== nextPropsColumn) {
      this.setFilter(nextPropsColumn)(from, to);
      return true;
    }

    return this.state.filter !== nextState.filter;
  }

  setFilter = column => (from, to) => {
    const { commit } = this.props;
    const filter = `timefilter from="${from}" to=${to} column=${column}`;

    // TODO: Changes to element.filter do not cause a re-render
    if (filter !== this.state.filter) {
      this.setState({ filter });
      commit(filter);
    }
  };

  render() {
    const ast = fromExpression(this.state.filter);
    const from = get(ast, 'chain[0].arguments.from[0]');
    const to = get(ast, 'chain[0].arguments.to[0]');
    const column = get(ast, 'chain[0].arguments.column[0]');

    if (this.props.compact) {
      return <TimePickerMini from={from} to={to} onSelect={this.setFilter(column)} />;
    } else {
      return <TimePicker from={from} to={to} onSelect={this.setFilter(column)} />;
    }
  }
}
