/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import dateMath from '@elastic/datemath';
import { EuiFieldText } from '@elastic/eui';
import moment from 'moment';

const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const parseDateString = val => {
  const parsed = moment(val, DATE_FORMAT, true);

  // attempt to parse as datemath
  if (!parsed.isValid()) {
    const dmParsed = dateMath.parse(val);

    if (dmParsed && dmParsed.isValid()) {
      return {
        isValid: true,
        parsed: dmParsed,
      };
    }
  }

  // if valid or invalid, and not valid datemath
  return {
    isValid: parsed.isValid(),
    parsed,
  };
};

export const DatetimeInput = ({ value, onChange }) => {
  const [isValid, setValid] = useState(true);
  const [inputValue, setInputValue] = useState(value.isValid ? value.format(DATE_FORMAT) : '');

  function check() {
    const dateString = parseDateString(inputValue);

    setValid(dateString.isValid);

    if (dateString.isValid) {
      const parsedValue = dateString.parsed.format(DATE_FORMAT);
      setInputValue(parsedValue);
      onChange(parsedValue);
    }
  }

  return (
    <EuiFieldText
      compressed
      value={inputValue}
      onChange={e => setInputValue(e.target.value)}
      onBlur={check}
      isInvalid={!isValid}
      style={{ textAlign: 'center' }}
    />
  );
};

DatetimeInput.propTypes = {
  value: PropTypes.object, // moment
  onChange: PropTypes.func,
};
