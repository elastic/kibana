/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

const strings = {
  getContextErrorMessage: (errorMessage: string) =>
    i18n.translate('xpack.canvas.functionForm.contextError', {
      defaultMessage: 'ERROR: {errorMessage}',
      values: {
        errorMessage,
      },
    }),
};
interface Props {
  context: {
    error: string;
  };
}

export const FunctionFormContextError: FunctionComponent<Props> = ({ context }) => (
  <div className="canvasFunctionForm canvasFunctionForm--error">
    {strings.getContextErrorMessage(context.error)}
  </div>
);

FunctionFormContextError.propTypes = {
  context: PropTypes.shape({ error: PropTypes.string }).isRequired,
};
