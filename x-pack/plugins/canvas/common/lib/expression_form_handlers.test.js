/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFormHandlers } from './expression_form_handlers';

describe('ExpressionFormHandlers', () => {
  it('executes destroy function', () => {
    const handler = new ExpressionFormHandlers();
    handler.onDestroy(() => {
      return 'DESTROYED!';
    });
    expect(handler.destroy()).toBe('DESTROYED!');
  });
});
