/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProvidersComponent } from '../../common/mocks/test_providers';
import { EmptyPage, INTEGRATION_LINK_ID, DOCS_LINK_TEST_ID } from './empty_page';

describe('<EmptyPage />', () => {
  describe('default state', () => {
    it('should render', () => {
      const { getByTestId } = render(
        <TestProvidersComponent>
          <EmptyPage integrationsPageLink="https://google.com" />
        </TestProvidersComponent>
      );
      const integrationsPageLink = getByTestId(`${INTEGRATION_LINK_ID}`);

      expect(screen.getByText('Get started with Elastic Threat Intelligence')).toBeInTheDocument();

      expect(integrationsPageLink).toBeInTheDocument();
      expect(integrationsPageLink).toHaveAttribute('href', 'https://google.com');

      expect(getByTestId(DOCS_LINK_TEST_ID)).toBeInTheDocument();
    });
  });
});
