/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiCallOut } from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { ShowDebugging } from './show_debugging';

export const Error = ({ payload }) => {
  const functionName = get(payload, 'info.functionName');
  const message = get(payload, 'error.message');

  return (
    <EuiCallOut
      style={{ maxWidth: 500 }}
      color="danger"
      iconType="cross"
      title={
        <FormattedMessage
          id="xpack.canvas.error.expressionErrorTitle"
          defaultMessage="Whoops! Expression failed"
        />
      }
    >
      <p>
        <FormattedMessage
          id="xpack.canvas.error.expressionErrorDescription"
          defaultMessage="The function {functionName} failed {message}"
          values={{
            functionName: (
              <strong>
                <FormattedMessage
                  id="xpack.canvas.error.expressionErrorDescription.functionName"
                  defaultMessage="{functionName}"
                  values={{ functionName }}
                />
              </strong>
            ),
            message: message ? (
              <FormattedMessage
                id="xpack.canvas.error.expressionErrorDescription.withFollowingMessage"
                defaultMessage="with the following message: "
              />
            ) : (
              '.'
            ),
          }}
        />
      </p>
      {message && <p style={{ padding: '0 16px' }}>{message}</p>}

      <ShowDebugging payload={payload} />
    </EuiCallOut>
  );
};

Error.propTypes = {
  payload: PropTypes.shape({
    info: PropTypes.object.isRequired,
    error: PropTypes.object.isRequired,
  }).isRequired,
};
