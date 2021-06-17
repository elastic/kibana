/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

jest.mock('../../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to }) => ({ href: to })),
}));

import { useGroupSubNav } from './group_sub_nav';

describe('useGroupSubNav', () => {
  it('renders nav items', () => {
    setMockValues({ group: { id: '1' } });

    expect(useGroupSubNav()).toEqual([
      {
        id: 'groupOverview',
        name: 'Overview',
        href: '/groups/1',
      },
      {
        id: 'groupSourcePrioritization',
        name: 'Source Prioritization',
        href: '/groups/1/source_prioritization',
      },
    ]);
  });

  it('returns undefined when no group id is present', () => {
    setMockValues({ group: {} });

    expect(useGroupSubNav()).toEqual(undefined);
  });
});
