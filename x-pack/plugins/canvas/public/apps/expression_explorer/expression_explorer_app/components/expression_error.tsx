/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { useExpressions } from '../hooks';
import { ErrorMessage } from './error_message';

export const ExpressionError: FC = () => {
  const { error } = useExpressions();
  if (!error) {
    return null;
  }

  return <ErrorMessage {...{ error }} />;
};
