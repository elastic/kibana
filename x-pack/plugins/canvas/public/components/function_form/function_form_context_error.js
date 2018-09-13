import React from 'react';
import PropTypes from 'prop-types';

export const FunctionFormContextError = ({ context }) => (
  <div className="canvasFunctionForm canvasFunctionForm--error">ERROR: {context.error}</div>
);

FunctionFormContextError.propTypes = {
  context: PropTypes.object,
};
