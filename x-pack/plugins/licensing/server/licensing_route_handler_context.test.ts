/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { ILicense } from './types';
import { setup } from './__fixtures__/setup';
import { createRouteHandlerContext } from './licensing_route_handler_context';

describe('licensingRouteHandlerContext', () => {
  it('provides the initial license value', async () => {
    const { license$, license } = await setup();

    const context = createRouteHandlerContext(license$);

    const { license: contextResult } = await context({});

    expect(contextResult).toBe(license);
  });

  it('provides the latest license value', async () => {
    const { license } = await setup();
    const license$ = new BehaviorSubject<ILicense>(license);

    const context = createRouteHandlerContext(license$);

    const latestLicense = (Symbol() as unknown) as ILicense;
    license$.next(latestLicense);

    const { license: contextResult } = await context({});

    expect(contextResult).toBe(latestLicense);
  });
});
