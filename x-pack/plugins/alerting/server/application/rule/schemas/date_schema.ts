/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { schema } from '@kbn/config-schema';

const validateDate = (string: unknown) => {
  if (typeof string !== 'string') {
    return `test string is not a string: ${string}`;
  }
  if (moment(string).isValid()) {
    return;
  }
  return `string is not a valid date: ${string}`;
};

export const dateSchema = schema.object({}, { unknowns: 'allow', validate: validateDate });
