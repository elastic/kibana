/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { templateVal } from './task';
import type { Hint } from './types';

describe('templateVal', () => {
  it('should replace kubernetes IP', () => {
    const val = 'hello ${kubernetes.pod.ip} world';
    const hint = { kubernetes: { pod: { ip: 'host1' } } } as Hint;

    expect(templateVal(val, hint)).toEqual('hello host1 world');
  });
  it('should not replace invalid var', () => {
    const val = 'hello ${type} world';
    const hint = { type: 'secret', kubernetes: { pod: { ip: 'host1' } } } as Hint;

    expect(templateVal(val, hint)).toEqual('hello ${type} world');
  });
});
