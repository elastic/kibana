/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to }) => ({ href: to })),
}));

import { mockUseRouteMatch } from '../../../../__mocks__/react_router';

import { useSettingsSubNav } from './settings_sub_nav';

describe('useSettingsSubNav', () => {
  it('returns an array of side nav items when on the /settings path', () => {
    mockUseRouteMatch.mockReturnValueOnce(true);

    expect(useSettingsSubNav()).toEqual([
      {
        id: 'settingsCustomize',
        name: 'Customize',
        href: '/settings/customize',
      },
      {
        id: 'settingsConnectors',
        name: 'Content source connectors',
        href: '/settings/connectors',
      },
      {
        id: 'settingsOAuth',
        name: 'OAuth application',
        href: '/settings/oauth',
      },
    ]);
  });

  it('returns undefined when not on the /settings path', () => {
    mockUseRouteMatch.mockReturnValueOnce(false);

    expect(useSettingsSubNav()).toEqual(undefined);
  });
});
