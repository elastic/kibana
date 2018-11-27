/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import CronParser from 'cron-parser';
import { FieldValue, FormData } from 'formsy-react';

const isIntervalSuffix = (token: string): boolean => /([1-9][0-9]*[smhd])$/.test(token);

const tokenize = (value: string): string[] =>
  value.split(' ').reduce((acc: string[], cur: string) => {
    if (cur !== '') {
      return acc.concat(cur);
    }
    return acc;
  }, []);

const parseInterval = (input: string): boolean => {
  const tokens = tokenize(input);
  return tokens.length === 2 && tokens[0] === '@every' && isIntervalSuffix(tokens[1]);
};

export const validateInterval = {
  id: 'isInterval',
  validationFunction: (values?: FormData, value?: FieldValue): boolean => {
    if (!value || value === '') {
      return false;
    }
    try {
      return parseInterval(value) || !!CronParser.parseExpression(value);
    } catch (err) {
      return false;
    }
  },
};
