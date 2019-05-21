/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isPlainObject } from 'lodash';
export const extractFields = (obj: any, path: string[] = [], fields: string[] = []): string[] => {
  if (!isPlainObject(obj)) {
    const newPath = path.join('.');
    if (!fields.includes(newPath)) {
      return [...fields, newPath];
    }
    return fields;
  }
  return Object.keys(obj).reduce((acc: string[], key: string) => {
    const value = obj[key];
    return extractFields(value, path.concat([key]), acc);
  }, fields);
};
