/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SetProcessor } from './set';

const typeNameToComponentMap = {
  set: SetProcessor,
};

export const getProcessorFormFromType = (type: keyof typeof typeNameToComponentMap) => {
  return typeNameToComponentMap[type];
};
