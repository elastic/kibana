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
