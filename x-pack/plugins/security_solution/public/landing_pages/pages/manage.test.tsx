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
import { ManagementCategories } from './manage';
import type { NavLinkItem } from '../../common/components/navigation/types';

const RULES_ITEM_LABEL = 'elastic rules!';
const EXCEPTIONS_ITEM_LABEL = 'exceptional!';
const CATEGORY_1_LABEL = 'first tests category';
const CATEGORY_2_LABEL = 'second tests category';

const defaultAppManageLink: NavLinkItem = {
  id: SecurityPageName.administration,
  title: 'admin',
  categories: [
    {
      label: CATEGORY_1_LABEL,
      linkIds: [SecurityPageName.rules],
    },
    {
      label: CATEGORY_2_LABEL,
      linkIds: [SecurityPageName.exceptions],
    },
  ],
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

const mockAppManageLink = jest.fn(() => defaultAppManageLink);
jest.mock('../../common/components/navigation/nav_links', () => ({
  useAppRootNavLink: () => mockAppManageLink(),
}));

describe('ManagementCategories', () => {
  it('should render items', () => {
    const { queryByText } = render(
      <TestProviders>
        <ManagementCategories />
      </TestProviders>
    );

    expect(queryByText(RULES_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(EXCEPTIONS_ITEM_LABEL)).toBeInTheDocument();
  });

  it('should render items in the same order as defined', () => {
    mockAppManageLink.mockReturnValueOnce({
      ...defaultAppManageLink,
      categories: [
        {
          label: '',
          linkIds: [SecurityPageName.exceptions, SecurityPageName.rules],
        },
      ],
    });
    const { queryAllByTestId } = render(
      <TestProviders>
        <ManagementCategories />
      </TestProviders>
    );

    const renderedItems = queryAllByTestId('LandingItem');

    expect(renderedItems[0]).toHaveTextContent(EXCEPTIONS_ITEM_LABEL);
    expect(renderedItems[1]).toHaveTextContent(RULES_ITEM_LABEL);
  });

  it('should not render category items filtered', () => {
    mockAppManageLink.mockReturnValueOnce({
      ...defaultAppManageLink,
      categories: [
        {
          label: CATEGORY_1_LABEL,
          linkIds: [SecurityPageName.rules, SecurityPageName.exceptions],
        },
      ],
      links: [
        {
          id: SecurityPageName.rules,
          title: RULES_ITEM_LABEL,
          description: '',
          icon: 'testIcon1',
        },
      ],
    });
    const { queryAllByTestId } = render(
      <TestProviders>
        <ManagementCategories />
      </TestProviders>
    );

    const renderedItems = queryAllByTestId('LandingItem');

    expect(renderedItems).toHaveLength(1);
    expect(renderedItems[0]).toHaveTextContent(RULES_ITEM_LABEL);
  });

  it('should not render category if all items filtered', () => {
    mockAppManageLink.mockReturnValueOnce({
      ...defaultAppManageLink,
      links: [],
    });
    const { queryByText } = render(
      <TestProviders>
        <ManagementCategories />
      </TestProviders>
    );

    expect(queryByText(CATEGORY_1_LABEL)).not.toBeInTheDocument();
    expect(queryByText(CATEGORY_2_LABEL)).not.toBeInTheDocument();
  });
});
