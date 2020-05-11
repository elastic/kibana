/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { InterpreterResult } from './expressions';
import { useExpressions } from '../hooks';

export const DebugTree: FC = () => {
  const { debug: result } = useExpressions();

  if (!result) {
    return null;
  }

  return <InterpreterResult {...{ result }} />;
};
