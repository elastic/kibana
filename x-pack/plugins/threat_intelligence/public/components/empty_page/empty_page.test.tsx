/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProvidersComponent } from '../../common/mocks/test_providers';
import { EmptyPage, displayName, TEST_ID_EMPTY_PAGE_DOCS_LINK } from './empty_page';

describe('<EmptyPage />', () => {
  describe('default state', () => {
    it('should render', () => {
      const { getByTestId } = render(
        <TestProvidersComponent>
          <EmptyPage integrationsPageLink="https://google.com" />
        </TestProvidersComponent>
      );
      const integrationsPageLink = getByTestId(`${displayName}-integrations-page-link`);

      expect(screen.getByText('Get started with Elastic Threat Intelligence')).toBeInTheDocument();

      expect(integrationsPageLink).toBeInTheDocument();
      expect(integrationsPageLink).toHaveAttribute('href', 'https://google.com');

      expect(getByTestId(TEST_ID_EMPTY_PAGE_DOCS_LINK)).toBeInTheDocument();
    });
  });
});
