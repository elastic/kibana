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
import { LandingCategories } from './manage';
import { NavLinkItem } from '../../common/components/navigation/types';

const RULES_ITEM_LABEL = 'elastic rules!';
const EXCEPTIONS_ITEM_LABEL = 'exceptional!';

const mockAppManageLink: NavLinkItem = {
  id: SecurityPageName.administration,
  title: 'admin',
  links: [
    {
      id: SecurityPageName.rules,
      title: RULES_ITEM_LABEL,
      description: '',
      icon: 'testIcon1',
    },
    {
      id: SecurityPageName.exceptions,
      title: EXCEPTIONS_ITEM_LABEL,
      description: '',
      icon: 'testIcon2',
    },
  ],
};
jest.mock('../../common/components/navigation/nav_links', () => ({
  useAppRootNavLink: jest.fn(() => mockAppManageLink),
}));

describe('LandingCategories', () => {
  it('renders items', () => {
    const { queryByText } = render(
      <TestProviders>
        <LandingCategories
          categories={[
            {
              label: 'first tests category',
              linkIds: [SecurityPageName.rules],
            },
            {
              label: 'second tests category',
              linkIds: [SecurityPageName.exceptions],
            },
          ]}
        />
      </TestProviders>
    );

    expect(queryByText(RULES_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(EXCEPTIONS_ITEM_LABEL)).toBeInTheDocument();
  });

  it('renders items in the same order as defined', () => {
    const { queryAllByTestId } = render(
      <TestProviders>
        <LandingCategories
          categories={[
            {
              label: '',
              linkIds: [SecurityPageName.exceptions, SecurityPageName.rules],
            },
          ]}
        />
      </TestProviders>
    );

    const renderedItems = queryAllByTestId('LandingItem');

    expect(renderedItems[0]).toHaveTextContent(EXCEPTIONS_ITEM_LABEL);
    expect(renderedItems[1]).toHaveTextContent(RULES_ITEM_LABEL);
  });
});
