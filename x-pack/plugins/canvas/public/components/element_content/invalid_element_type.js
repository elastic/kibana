/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

export const InvalidElementType = ({ renderableType, selectElement }) => (
  <h3 onClick={selectElement}>Element not found: {renderableType}</h3>
);

InvalidElementType.propTypes = {
  renderableType: PropTypes.string,
  selectElement: PropTypes.func,
};
