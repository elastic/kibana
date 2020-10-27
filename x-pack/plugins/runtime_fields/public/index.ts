/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RuntimeFieldsPlugin } from './plugin';

export { RuntimeFieldForm } from './components';
export { RUNTIME_FIELD_OPTIONS } from './constants';
export { RuntimeType } from './types';

export function plugin() {
  return new RuntimeFieldsPlugin();
}
