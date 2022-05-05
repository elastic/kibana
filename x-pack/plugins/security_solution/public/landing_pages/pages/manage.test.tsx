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
import { LandingCategories, NavConfigType } from './manage';

const RULES_ITEM_LABEL = 'elastic rules!';
const EXCEPTIONS_ITEM_LABEL = 'exceptional!';

const testConfig: NavConfigType = {
  categories: [
    {
      label: 'first tests category',
      itemIds: [SecurityPageName.rules],
    },
    {
      label: 'second tests category',
      itemIds: [SecurityPageName.exceptions],
    },
  ],
  items: [
    {
      id: SecurityPageName.rules,
      label: RULES_ITEM_LABEL,
      description: '',
      icon: 'testIcon1',
    },
    {
      id: SecurityPageName.exceptions,
      label: EXCEPTIONS_ITEM_LABEL,
      description: '',
      icon: 'testIcon2',
    },
  ],
};

describe('LandingCategories', () => {
  it('renders items', () => {
    const { queryByText } = render(
      <TestProviders>
        <LandingCategories navConfig={testConfig} />
      </TestProviders>
    );

    expect(queryByText(RULES_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(EXCEPTIONS_ITEM_LABEL)).toBeInTheDocument();
  });

  it('renders items in the same order as defined', () => {
    const { queryAllByTestId } = render(
      <TestProviders>
        <LandingCategories
          navConfig={{
            ...testConfig,
            categories: [
              {
                label: '',
                itemIds: [SecurityPageName.exceptions, SecurityPageName.rules],
              },
            ],
          }}
        />
      </TestProviders>
    );

    const renderedItems = queryAllByTestId('LandingItem');

    expect(renderedItems[0]).toHaveTextContent(EXCEPTIONS_ITEM_LABEL);
    expect(renderedItems[1]).toHaveTextContent(RULES_ITEM_LABEL);
  });
});
