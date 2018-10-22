/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFieldText } from '@elastic/eui';
import moment from 'moment';

export const DatetimeInput = ({ strValue, setStrValue, setMoment, valid, setValid }) => {
  function check(e) {
    const parsed = moment(e.target.value, 'YYYY-MM-DD HH:mm:ss', true);
    if (parsed.isValid()) {
      setMoment(parsed);
      setValid(true);
    } else {
      setValid(false);
    }
    setStrValue(e.target.value);
  }

  return (
    <EuiFieldText
      compressed
      value={strValue}
      onChange={check}
      isInvalid={!valid}
      style={{ textAlign: 'center' }}
    />
  );
};

DatetimeInput.propTypes = {
  setMoment: PropTypes.func,
  strValue: PropTypes.string,
  setStrValue: PropTypes.func,
  valid: PropTypes.bool,
  setValid: PropTypes.func,
};
