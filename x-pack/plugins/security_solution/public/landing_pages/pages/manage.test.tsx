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

const RULES_ITEM_LABEL = 'elastic rules!';
const EXCEPTIONS_ITEM_LABEL = 'exceptional!';
import { NavLinkItem } from '../../common/links/types';

const mockAppLinks: NavLinkItem[] = [
  {
    id: SecurityPageName.administration,
    path: '',
    title: 'admin',
    links: [
      {
        id: SecurityPageName.rules,
        title: RULES_ITEM_LABEL,
        description: '',
        icon: 'testIcon1',
        path: '',
      },
      {
        id: SecurityPageName.exceptions,
        title: EXCEPTIONS_ITEM_LABEL,
        description: '',
        icon: 'testIcon2',
        path: '',
      },
    ],
  },
];

jest.mock('../../common/links', () => ({
  useAppNavLinks: jest.fn(() => mockAppLinks),
}));

describe('LandingCategories', () => {
  it('renders items', () => {
    const { queryByText } = render(
      <TestProviders>
        <LandingCategories
          groups={[
            {
              label: 'first tests category',
              itemIds: [SecurityPageName.rules],
            },
            {
              label: 'second tests category',
              itemIds: [SecurityPageName.exceptions],
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
          groups={[
            {
              label: '',
              itemIds: [SecurityPageName.exceptions, SecurityPageName.rules],
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
