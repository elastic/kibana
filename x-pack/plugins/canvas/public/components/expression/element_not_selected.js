import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton } from '@elastic/eui';

export const ElementNotSelected = ({ done }) => (
  <div>
    <div>Select an element to show expression input</div>
    {done && (
      <EuiButton size="s" onClick={done}>
        {' '}
        Close
      </EuiButton>
    )}
  </div>
);

ElementNotSelected.propTypes = {
  done: PropTypes.func,
};
