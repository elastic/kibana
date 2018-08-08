/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

function StatusText({
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  text
}) {
  const xTransform = `calc(-50% + ${marginLeft - marginRight}px)`;
  const yTransform = `calc(-50% + ${marginTop - marginBottom}px - 15px)`;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(${xTransform},${yTransform})`
      }}
    >
      {text}
    </div>
  );
}

StatusText.propTypes = {
  text: PropTypes.string
};

export default StatusText;
