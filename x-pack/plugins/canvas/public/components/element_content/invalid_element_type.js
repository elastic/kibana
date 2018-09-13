import React from 'react';
import PropTypes from 'prop-types';

export const InvalidElementType = ({ renderableType, selectElement }) => (
  <h3 onClick={selectElement}>Element not found: {renderableType}</h3>
);

InvalidElementType.propTypes = {
  renderableType: PropTypes.string,
  selectElement: PropTypes.func,
};
