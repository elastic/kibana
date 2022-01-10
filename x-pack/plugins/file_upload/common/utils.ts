/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isPopulatedObject = <U extends string = string>(
  arg: unknown,
  requiredAttributes: U[] = []
): arg is Record<U, unknown> => {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    Object.keys(arg).length > 0 &&
    (requiredAttributes.length === 0 ||
      requiredAttributes.every((d) => ({}.hasOwnProperty.call(arg, d))))
  );
};
