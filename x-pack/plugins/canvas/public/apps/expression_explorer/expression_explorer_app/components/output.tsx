/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { useExpressions } from '../hooks';
import { InterpreterResult } from './expressions';

export const Output: FC = () => {
  const { debug } = useExpressions();
  let render = <div>Waiting for valid result...</div>;
  if (debug) {
    render = <InterpreterResult result={debug} />;
  }
  return render;
};
