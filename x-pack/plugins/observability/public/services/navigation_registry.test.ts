/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNavigationRegistry } from './navigation_registry';
import { of } from 'rxjs';
import { skip } from 'rxjs/operators';

describe('Navigation registry', () => {
  it('Allows the registration of, and access to, navigation sections', (done) => {
    const navigationRegistry = createNavigationRegistry();

    navigationRegistry.registerSections(
      of([
        {
          label: 'Test A',
          sortKey: 100,
          entries: [
            { label: 'Url A', app: 'TestA', path: '/url-a' },
            { label: 'Url B', app: 'TestA', path: '/url-b' },
          ],
        },
        {
          label: 'Test B',
          sortKey: 200,
          entries: [
            { label: 'Url A', app: 'TestB', path: '/url-a' },
            { label: 'Url B', app: 'TestB', path: '/url-b' },
          ],
        },
      ])
    );

    // Skip the default value from startWith
    navigationRegistry.sections$.pipe(skip(1)).subscribe((data) => {
      expect(data).toEqual([
        {
          label: 'Test A',
          sortKey: 100,
          entries: [
            {
              label: 'Url A',
              app: 'TestA',
              path: '/url-a',
            },
            {
              label: 'Url B',
              app: 'TestA',
              path: '/url-b',
            },
          ],
        },
        {
          label: 'Test B',
          sortKey: 200,
          entries: [
            {
              label: 'Url A',
              app: 'TestB',
              path: '/url-a',
            },
            {
              label: 'Url B',
              app: 'TestB',
              path: '/url-b',
            },
          ],
        },
      ]);
      done();
    });
  });
});
