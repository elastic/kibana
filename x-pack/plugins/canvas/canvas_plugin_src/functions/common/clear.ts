/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Function } from '../types';
import { getFunctionHelp } from '../../strings';

export function clear(): Function<'clear', {}, null> {
  const { help } = getFunctionHelp().clear;

  return {
    name: 'clear',
    type: 'null',
    help,
    args: {},
    fn: () => null,
  };
}
