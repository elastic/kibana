/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { appStoreFactory } from './index';
import { coreMock } from '../../../../../../../src/core/public/mocks';

describe('endpoint app store', () => {
  test('it creates global app store', () => {
    const coreStart = coreMock.createStart({ basePath: '/mock' });
    const store = appStoreFactory(coreStart);

    expect(store.dispatch).toBeInstanceOf(Function);
  });
});
