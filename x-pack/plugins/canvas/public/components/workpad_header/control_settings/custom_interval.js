/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiButton, EuiFieldText } from '@elastic/eui';

const getRefreshInterval = (val = '') => {
  // if it's a number, there is no interval, return undefined
  if (!isNaN(Number(val))) {
    return;
  }

  // if it's a string, try to parse out the shorthand duration value
  const match = String(val).match(/^([0-9]{1,})([hmsd])$/);

  // if it's invalid, there is no interval, return undefined
  if (!match) {
    return;
  }

  switch (match[2]) {
    case 's':
      return match[1] * 1000;
    case 'm':
      return match[1] * 1000 * 60;
    case 'h':
      return match[1] * 1000 * 60 * 60;
    case 'd':
      return match[1] * 1000 * 60 * 60 * 24;
  }
};

export const CustomInterval = ({ gutterSize, buttonSize, onSubmit, defaultValue }) => {
  const [customInterval, setCustomInterval] = useState(defaultValue);
  const refreshInterval = getRefreshInterval(customInterval);
  const isInvalid = Boolean(customInterval.length && !refreshInterval);

  const handleChange = ev => setCustomInterval(ev.target.value);

  return (
    <form
      onSubmit={ev => {
        ev.preventDefault();
        onSubmit(refreshInterval);
      }}
    >
      <EuiFlexGroup gutterSize={gutterSize}>
        <EuiFlexItem>
          <EuiFormRow
            label="Set a custom interval"
            helpText="Use shorthand notation, like 30s, 10m, or 1h"
            compressed
          >
            <EuiFieldText isInvalid={isInvalid} value={customInterval} onChange={handleChange} />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFormRow label="&nbsp;">
            <EuiButton
              disabled={isInvalid}
              size={buttonSize}
              type="submit"
              style={{ minWidth: 'auto' }}
            >
              Set
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );
};

CustomInterval.propTypes = {
  buttonSize: PropTypes.string,
  gutterSize: PropTypes.string,
  defaultValue: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
};

CustomInterval.defaultProps = {
  buttonSize: 's',
  gutterSize: 's',
  defaultValue: '',
};
