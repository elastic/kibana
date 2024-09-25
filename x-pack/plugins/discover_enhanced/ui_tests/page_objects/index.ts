/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@playwright/test';
export { DiscoverApp } from './discover_app';
export { DatePicker } from './date_picker';

// Leveraging TypeScript decorators to wrap functions
// https://www.typescriptlang.org/docs/handbook/decorators.html
// A boxed test.step() gets defined with the name of the method
export function boxedStep(target: Function, context: ClassMethodDecoratorContext) {
  return function replacementMethod(...args: any) {
    const name = this.constructor.name + '.' + (context.name as string);
    return test.step(
      name,
      async () => {
        return await target.call(this, ...args);
      },
      { box: true }
    ); // Note the "box" option here.
  };
}
