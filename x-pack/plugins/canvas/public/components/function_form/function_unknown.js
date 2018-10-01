/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

export const FunctionUnknown = ({ argType }) => (
  <div className="canvasFunctionForm canvasFunctionForm--unknown-expression">
    <FormattedMessage
      id="xpack.canvas.functionForm.unknownExpressionTypeErrorMessage"
      defaultMessage="Unknown expression type '{typeError}'"
      values={{ typeError: argType }}
    />
  </div>
);

FunctionUnknown.propTypes = {
  argType: PropTypes.string,
};
