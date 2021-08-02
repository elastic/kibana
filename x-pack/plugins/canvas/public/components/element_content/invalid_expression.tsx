/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Disabling eslint because of this jsx-a11y error(https://www.npmjs.com/package/eslint-plugin-jsx-a11y):
 11:3  error  Non-interactive elements should not be assigned mouse or keyboard event listeners  jsx-a11y/no-noninteractive-element-interactions
 */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

import React from 'react';
import PropTypes from 'prop-types';

export interface Props {
  selectElement: () => void;
}

export const InvalidExpression = ({ selectElement }: Props) => (
  <h3 onClick={selectElement}>Invalid expression</h3>
);

InvalidExpression.propTypes = {
  selectElement: PropTypes.func,
};
