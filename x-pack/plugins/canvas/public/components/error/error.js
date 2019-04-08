/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiCallOut } from '@elastic/eui';
import { get } from 'lodash';
import { ShowDebugging } from './show_debugging';

export const Error = ({ payload }) => {
  const message = get(payload, 'error.message');

  return (
    <EuiCallOut
      style={{ maxWidth: 500 }}
      color="danger"
      iconType="cross"
      title="Whoops! Expression failed"
    >
      <p>{message ? 'Expression failed with the message:' : ''}</p>
      {message && <p style={{ padding: '0 16px' }}>{message}</p>}

      <ShowDebugging payload={payload} />
    </EuiCallOut>
  );
};

Error.propTypes = {
  payload: PropTypes.object.isRequired,
};
