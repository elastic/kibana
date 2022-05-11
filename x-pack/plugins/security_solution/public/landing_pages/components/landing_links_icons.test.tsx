/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { SecurityPageName } from '../../app/types';
import { NavLinkItem } from '../../common/links/types';
import { TestProviders } from '../../common/mock';
import { LandingLinksIcons } from './landing_links_icons';

const DEFAULT_NAV_ITEM: NavLinkItem = {
  id: SecurityPageName.overview,
  title: 'TEST LABEL',
  description: 'TEST DESCRIPTION',
  icon: 'myTestIcon',
  path: '',
};

const mockNavigateTo = jest.fn();
jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');
  return {
    ...originalModule,
    useNavigation: () => ({
      navigateTo: mockNavigateTo,
    }),
  };
});

jest.mock('../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../common/components/link_to');
  return {
    ...originalModule,
    useFormatUrl: (id: string) => ({
      formatUrl: jest.fn().mockImplementation((path: string) => `/${id}`),
      search: '',
    }),
  };
});

describe('LandingLinksIcons', () => {
  it('renders', () => {
    const title = 'test label';

    const { queryByText } = render(
      <TestProviders>
        <LandingLinksIcons items={[{ ...DEFAULT_NAV_ITEM, title }]} />
      </TestProviders>
    );

    expect(queryByText(title)).toBeInTheDocument();
  });

  it('renders navigation link', () => {
    const id = SecurityPageName.administration;
    const title = 'myTestLable';

    const { getByText } = render(
      <TestProviders>
        <LandingLinksIcons items={[{ ...DEFAULT_NAV_ITEM, id, title }]} />
      </TestProviders>
    );

    fireEvent.click(getByText(title));

    expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/administration' });
  });
});
