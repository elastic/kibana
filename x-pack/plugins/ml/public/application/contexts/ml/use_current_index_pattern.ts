/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';

import { MlContext } from './ml_context';

export const useCurrentIndexPattern = () => {
  const context = useContext(MlContext);

  if (context.currentIndexPattern === undefined) {
    throw new Error('currentIndexPattern is undefined');
  }

  return context.currentIndexPattern;
};
