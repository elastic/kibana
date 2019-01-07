/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiExpression } from '@elastic/eui';

export function GroupByExpression({ term }) {
  return (
    <EuiExpression
      description="GROUP BY"
      value={`right.${term}`}
    />
  );
}

GroupByExpression.propTypes = {
  term: PropTypes.string.isRequired,
};
