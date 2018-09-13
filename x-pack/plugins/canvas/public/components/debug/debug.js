import React from 'react';
import PropTypes from 'prop-types';
import { EuiCode } from '@elastic/eui';
export const Debug = ({ payload }) => (
  <EuiCode className="canvasDebug">
    <pre className="canvasDebug__content">{JSON.stringify(payload, null, 2)}</pre>
  </EuiCode>
);

Debug.propTypes = {
  payload: PropTypes.object.isRequired,
};
