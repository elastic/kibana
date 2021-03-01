/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isPopulatedObject = <T = Record<string, any>>(arg: any): arg is T => {
  return typeof arg === 'object' && arg !== null && Object.keys(arg).length > 0;
};
