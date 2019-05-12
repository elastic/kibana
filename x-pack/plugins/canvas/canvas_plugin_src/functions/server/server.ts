/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Function } from '../types';
import { getFunctionHelp } from '../../strings';

export function server(): Function<'server', {}, any> {
  const { help } = getFunctionHelp().server;

  return {
    name: 'server',
    help,
    args: {},
    fn: context => context,
  };
}
