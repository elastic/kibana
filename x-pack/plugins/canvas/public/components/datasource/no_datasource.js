import React from 'react';
import PropTypes from 'prop-types';
import { EuiPanel, EuiText } from '@elastic/eui';

export const NoDatasource = () => (
  <EuiPanel>
    <EuiText>
      <h4>No data source present</h4>
      <p>
        This element does not have an attached data source. This is usually because the element is
        an image or other static asset. If that's not the case you might want to check your
        expression to make sure it is not malformed.
      </p>
    </EuiText>
  </EuiPanel>
);

NoDatasource.propTypes = {
  done: PropTypes.func,
};
