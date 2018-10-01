/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

export const FunctionFormContextError = ({ context }) => (
  <div className="canvasFunctionForm canvasFunctionForm--error">
    <FormattedMessage
      id="xpack.canvas.functionForm.contextErrorMessage"
      defaultMessage="ERROR: {contextError}"
      values={{ contextError: context.error }}
    />
  </div>
);

FunctionFormContextError.propTypes = {
  context: PropTypes.object,
};
