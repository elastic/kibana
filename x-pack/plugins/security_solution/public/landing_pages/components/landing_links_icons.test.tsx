/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { SecurityPageName } from '../../app/types';
import { TestProviders } from '../../common/mock';
import { LandingLinksIcons, NavItem } from './landing_links_icons';

const DEFAULT_NAV_ITEM: NavItem = {
  id: SecurityPageName.overview,
  label: 'TEST LABEL',
  description: 'TEST DESCRIPTION',
  icon: 'myTestIcon',
};

const mockNavigateTo = jest.fn();
jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');
  return {
    ...originalModule,
    useNavigateTo: () => ({
      navigateTo: mockNavigateTo,
    }),
  };
});

jest.mock('../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../common/components/link_to');
  return {
    ...originalModule,
    useGetSecuritySolutionUrl: () =>
      jest.fn(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`),
  };
});

describe('LandingLinksIcons', () => {
  it('renders', () => {
    const label = 'test label';

    const { queryByText } = render(
      <TestProviders>
        <LandingLinksIcons items={[{ ...DEFAULT_NAV_ITEM, label }]} />
      </TestProviders>
    );

    expect(queryByText(label)).toBeInTheDocument();
  });

  it('renders navigation link', () => {
    const id = SecurityPageName.administration;
    const label = 'myTestLable';

    const { getByText } = render(
      <TestProviders>
        <LandingLinksIcons items={[{ ...DEFAULT_NAV_ITEM, id, label }]} />
      </TestProviders>
    );

    getByText(label).click();

    expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/administration' });
  });
});
