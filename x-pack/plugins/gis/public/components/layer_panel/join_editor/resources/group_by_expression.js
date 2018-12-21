/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

export function GroupByExpression({ term }) {
  return (
    <div className="euiExpressionButton euiText">
      <span className="euiExpressionButton__description">GROUP BY</span>{' '}
      <span className="euiExpressionButton__value">{`right.${term}`}</span>
    </div>
  );
}

GroupByExpression.propTypes = {
  term: PropTypes.string.isRequired,
};
