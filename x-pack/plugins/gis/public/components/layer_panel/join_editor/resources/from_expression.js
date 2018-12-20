/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export function FromExpression({ leftSourceName }) {
  return (
    <div className="euiExpressionButton euiText">
      <span className="euiExpressionButton__description">FROM</span>{' '}
      <span className="euiExpressionButton__value">{`${leftSourceName} left`}</span>
    </div>
  );
}
