/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransformerArgs } from './types';

export const informationCreated = ({
  value,
  date,
  user,
  previousValue,
}: TransformerArgs): TransformerArgs => ({
  value: `${value} (created at ${date} by ${user})`,
  previousValue,
});

export const informationUpdated = ({
  value,
  date,
  user,
  previousValue,
}: TransformerArgs): TransformerArgs => ({
  value: `${value} (updated at ${date} by ${user})`,
  previousValue,
});

export const append = ({ value, previousValue }: TransformerArgs): TransformerArgs => ({
  value: `${value} ${previousValue}`,
});
