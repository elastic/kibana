/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

export const Suggestion = ({ item }) => (
  <div className="canvasExpressionSuggestion">
    <div className="canvasExpressionSuggestion__name">{item.name}</div>
    <div className="canvasExpressionSuggestion__desc">{item.description}</div>
  </div>
);

Suggestion.propTypes = {
  item: PropTypes.object,
};
