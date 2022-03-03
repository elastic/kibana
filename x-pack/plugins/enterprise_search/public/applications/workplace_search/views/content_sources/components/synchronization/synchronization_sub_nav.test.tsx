/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

jest.mock('../../../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to }) => ({ href: to })),
}));

import { useSynchronizationSubNav } from './synchronization_sub_nav';

describe('useSynchronizationSubNav', () => {
  it('renders nav items', () => {
    setMockValues({ contentSource: { id: '1', isSyncConfigEnabled: true } });

    expect(useSynchronizationSubNav()).toEqual([
      {
        id: 'sourceSynchronizationFrequency',
        name: 'Frequency',
        href: '/sources/1/synchronization/frequency',
      },
      {
        id: 'sourceSynchronizationAssetsAndObjects',
        name: 'Assets and objects',
        href: '/sources/1/synchronization/assets_and_objects',
      },
    ]);
  });

  it('returns undefined when no content source id is present', () => {
    setMockValues({ contentSource: {} });

    expect(useSynchronizationSubNav()).toEqual(undefined);
  });
});
