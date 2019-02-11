/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiRange, EuiFormErrorText } from '@elastic/eui';

function isWithinRange(min, max, value) {
  if (value >= min && value <= max) {
    return true;
  }

  return false;
}

// TODO move to EUI
// Wrapper around EuiRange that ensures onChange callback is only called when value is number and within min/max
export class ValidatedRange extends React.Component {

  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.value !== prevState.prevValue) {
      return {
        value: nextProps.value,
        prevValue: nextProps.value,
        isValid: isWithinRange(nextProps.min, nextProps.max, nextProps.value),
      };
    }

    return null;
  }

  _onRangeChange = (e) => {
    const sanitizedValue = parseFloat(e.target.value, 10);
    let newValue = isNaN(sanitizedValue) ? '' : sanitizedValue;
    // work around for https://github.com/elastic/eui/issues/1458
    // TODO remove once above EUI issue is resolved
    newValue = Number(newValue);

    const isValid = isWithinRange(this.props.min, this.props.max, newValue)
      ? true
      : false;

    this.setState({
      value: newValue,
      isValid,
    });

    if (isValid) {
      this.props.onChange(newValue);
    }
  };

  render() {
    const {
      max,
      min,
      value, // eslint-disable-line no-unused-vars
      onChange, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    let errorMessage;
    if (!this.state.isValid) {
      errorMessage = (
        <EuiFormErrorText>
          {`Must be between ${min} and ${max}`}
        </EuiFormErrorText>
      );
    }

    return (
      <Fragment>
        <EuiRange
          min={min}
          max={max}
          value={this.state.value.toString()}
          onChange={this._onRangeChange}
          {...rest}
        />
        {errorMessage}
      </Fragment>
    );
  }
}
