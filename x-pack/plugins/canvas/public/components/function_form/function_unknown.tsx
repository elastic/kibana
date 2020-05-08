/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { ComponentStrings } from '../../../i18n';

interface Props {
  /** the type of the argument */
  argType: string;
}
const { FunctionFormFunctionUnknown: strings } = ComponentStrings;

export const FunctionUnknown: FunctionComponent<Props> = ({ argType }) => (
  <div className="canvasFunctionForm canvasFunctionForm--unknown-expression">
    {strings.getUnknownArgumentTypeErrorMessage(argType)}
  </div>
);

FunctionUnknown.propTypes = {
  argType: PropTypes.string,
};
