/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';

// It takes a function spec and passes in default args into the spec fn
export const functionWrapper = (fnSpec, mockReduxStore) => {
  const spec = fnSpec();
  const defaultArgs = mapValues(spec.args, (argSpec) => {
    return argSpec.default;
  });

  return (context, args, handlers) =>
    spec.fn(context, { ...defaultArgs, ...args }, handlers, mockReduxStore);
};
