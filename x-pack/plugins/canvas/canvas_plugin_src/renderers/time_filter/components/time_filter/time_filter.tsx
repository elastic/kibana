/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore unconverted Elastic lib
import { fromExpression } from '@kbn/interpreter/common';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { TimePicker } from '../time_picker';
import { TimePickerMini } from '../time_picker_mini';

export interface Props {
  /** Initial value of the filter */
  filter: string;
  /** Function invoked when the filter changes */
  commit: (filter: string) => void;
  /** Determines if compact or normal time picker is displayed */
  compact?: boolean;
}

export interface State {
  filter: string;
}

export class TimeFilter extends Component<Props, State> {
  public static propTypes = {
    filter: PropTypes.string.isRequired,
    commit: PropTypes.func.isRequired, // Canvas filter
    compact: PropTypes.bool,
  };

  public state = {
    filter: this.props.filter,
  };

  public shouldComponentUpdate(nextProps: Props, nextState: State) {
    const nextPropsColumn = get(
      fromExpression(nextProps.filter),
      'chain[0].arguments.column[0]',
      ''
    );
    const ast = fromExpression(this.state.filter);
    const from = get(ast, 'chain[0].arguments.from[0]', '');
    const to = get(ast, 'chain[0].arguments.to[0]', '');
    const column = get(ast, 'chain[0].arguments.column[0]', '');

    // if the column in the prop filter changes, we need to update the column in state
    // while preserving the date ranges in state
    if (column !== nextPropsColumn) {
      this.setFilter(nextPropsColumn)(from, to);
      return true;
    }

    return this.state.filter !== nextState.filter;
  }

  public setFilter = (column: string) => (from: string, to: string) => {
    const { commit } = this.props;
    const filter = `timefilter from="${from}" to=${to} column=${column}`;

    if (filter !== this.state.filter) {
      this.setState({ filter });
      commit(filter);
    }
  };

  public render() {
    const ast = fromExpression(this.state.filter);
    const from = get(ast, 'chain[0].arguments.from[0]', '');
    const to = get(ast, 'chain[0].arguments.to[0]', '');
    const column = get(ast, 'chain[0].arguments.column[0]', '');

    if (this.props.compact) {
      return <TimePickerMini from={from} to={to} onSelect={this.setFilter(column)} />;
    } else {
      return <TimePicker from={from} to={to} onSelect={this.setFilter(column)} />;
    }
  }
}
