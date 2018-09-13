/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

export const InvalidExpression = ({ selectElement }) => (
  <h3 onClick={selectElement}>Invalid expression</h3>
);

InvalidExpression.propTypes = {
  selectElement: PropTypes.func,
};
