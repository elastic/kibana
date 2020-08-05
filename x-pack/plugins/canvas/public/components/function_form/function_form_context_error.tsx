/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { ComponentStrings } from '../../../i18n/components';

interface Props {
  context: {
    error: string;
  };
}

const { FunctionFormContextError: strings } = ComponentStrings;

export const FunctionFormContextError: FunctionComponent<Props> = ({ context }) => (
  <div className="canvasFunctionForm canvasFunctionForm--error">
    {strings.getContextErrorMessage(context.error)}
  </div>
);

FunctionFormContextError.propTypes = {
  context: PropTypes.shape({ error: PropTypes.string }).isRequired,
};
