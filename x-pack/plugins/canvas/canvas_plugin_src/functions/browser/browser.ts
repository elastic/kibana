/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Function } from '../types';

export function browser(): Function<'browser', {}, any> {
  return {
    name: 'browser',
    help: 'Force the interpreter to return to the browser',
    args: {},
    fn: context => context,
  };
}
