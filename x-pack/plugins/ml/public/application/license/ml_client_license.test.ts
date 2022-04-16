/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subject } from 'rxjs';
import { ILicense } from '@kbn/licensing-plugin/common/types';

import { MlClientLicense } from './ml_client_license';

describe('MlClientLicense', () => {
  test('should miss the license update when initialized without postInitFunction', () => {
    const mlLicense = new MlClientLicense();

    // upon instantiation the full license doesn't get set
    expect(mlLicense.isFullLicense()).toBe(false);

    const license$ = new Subject();

    mlLicense.setup(license$ as Observable<ILicense>);

    // if the observable wasn't triggered the full license is still not set
    expect(mlLicense.isFullLicense()).toBe(false);

    license$.next({
      check: () => ({ state: 'valid' }),
      getFeature: () => ({ isEnabled: true }),
      status: 'valid',
    });

    // once the observable triggered the license should be set
    expect(mlLicense.isFullLicense()).toBe(true);
  });

  test('should not miss the license update when initialized with postInitFunction', (done) => {
    const mlLicense = new MlClientLicense();

    // upon instantiation the full license doesn't get set
    expect(mlLicense.isFullLicense()).toBe(false);

    const license$ = new Subject();

    mlLicense.setup(license$ as Observable<ILicense>, [
      (license) => {
        // when passed in via postInitFunction callback, the license should be valid
        // even if the license$ observable gets triggered after this setup.
        expect(license.isFullLicense()).toBe(true);
        done();
      },
    ]);

    license$.next({
      check: () => ({ state: 'valid' }),
      getFeature: () => ({ isEnabled: true }),
      status: 'valid',
    });
  });
});
