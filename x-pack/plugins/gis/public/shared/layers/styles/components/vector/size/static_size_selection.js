/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiRange
} from '@elastic/eui';

export function StaticSizeSelection({ onChange, styleOptions }) {

  const onSizeChange = (event) => {
    const size = parseInt(event.target.value, 10);
    onChange({ size });
  };

  return (
    <EuiRange
      min={0}
      max={100}
      value={styleOptions.size.toString()}
      onChange={onSizeChange}
      showInput
    />
  );
}

StaticSizeSelection.propTypes = {
  styleOptions: PropTypes.shape({
    size: PropTypes.number.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired
};
