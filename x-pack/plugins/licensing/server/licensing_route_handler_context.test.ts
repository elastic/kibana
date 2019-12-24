/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { licenseMock } from '../common/licensing.mock';

import { createRouteHandlerContext } from './licensing_route_handler_context';

describe('createRouteHandlerContext', () => {
  it('returns a function providing the last license value', async () => {
    const firstLicense = licenseMock.createLicense();
    const secondLicense = licenseMock.createLicense();
    const license$ = new BehaviorSubject(firstLicense);

    const routeHandler = createRouteHandlerContext(license$);

    const firstCtx = await routeHandler({}, {} as any, {} as any);
    license$.next(secondLicense);
    const secondCtx = await routeHandler({}, {} as any, {} as any);

    expect(firstCtx.license).toBe(firstLicense);
    expect(secondCtx.license).toBe(secondLicense);
  });
});
