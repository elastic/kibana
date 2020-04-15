/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransformerArgs } from './types';
import * as i18n from './translations';

export const informationCreated = ({
  value,
  date,
  user,
  ...rest
}: TransformerArgs): TransformerArgs => ({
  value: `${value} ${i18n.FIELD_INFORMATION('create', date, user)}`,
  ...rest,
});

export const informationUpdated = ({
  value,
  date,
  user,
  ...rest
}: TransformerArgs): TransformerArgs => ({
  value: `${value} ${i18n.FIELD_INFORMATION('update', date, user)}`,
  ...rest,
});

export const informationAdded = ({
  value,
  date,
  user,
  ...rest
}: TransformerArgs): TransformerArgs => ({
  value: `${value} ${i18n.FIELD_INFORMATION('add', date, user)}`,
  ...rest,
});

export const append = ({ value, previousValue, ...rest }: TransformerArgs): TransformerArgs => ({
  value: previousValue ? `${previousValue} \r\n${value}` : `${value}`,
  ...rest,
});
