/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { exampleScript, painlessContextOptions } from './common/constants';

export interface Store {
  context: string;
  code: string;
  parameters: string;
  index: string;
  document: string;
  query: string;
}

export const initialState = {
  context: painlessContextOptions[0].value,
  code: exampleScript,
  parameters: '',
  index: '',
  document: '',
  query: '',
};
