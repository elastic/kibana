/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import PropTypes from 'prop-types';
import React, { Fragment } from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';


export const EnableModelPlotCallout = ({ message }) => (
  <Fragment>
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiCallOut
          title={'Proceed with caution!'}
          color="warning"
          iconType="help"
        >
          <p>
            {message}
          </p>
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  </Fragment>
);

EnableModelPlotCallout.propTypes = {
  message: PropTypes.string.isRequired,
};
