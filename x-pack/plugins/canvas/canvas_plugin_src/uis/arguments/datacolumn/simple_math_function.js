/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiSelect } from '@elastic/eui';
import { ArgumentStrings } from '../../../../i18n';

const { DataColumn: strings } = ArgumentStrings;

export const SimpleMathFunction = ({ onChange, value, inputRef, onlymath }) => {
  const options = [
    { text: strings.getOptionAverage(), value: 'mean' },
    { text: strings.getOptionCount(), value: 'size' },
    { text: strings.getOptionFirst(), value: 'first' },
    { text: strings.getOptionLast(), value: 'last' },
    { text: strings.getOptionMax(), value: 'max' },
    { text: strings.getOptionMedian(), value: 'median' },
    { text: strings.getOptionMin(), value: 'min' },
    { text: strings.getOptionSum(), value: 'sum' },
    { text: strings.getOptionUnique(), value: 'unique' },
  ];

  if (!onlymath) {
    options.unshift({ text: strings.getOptionValue(), value: '' });
  }

  return (
    <EuiSelect compressed options={options} inputRef={inputRef} value={value} onChange={onChange} />
  );
};

SimpleMathFunction.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  inputRef: PropTypes.func,
  onlymath: PropTypes.bool,
};

SimpleMathFunction.defaultProps = {
  value: '',
};
