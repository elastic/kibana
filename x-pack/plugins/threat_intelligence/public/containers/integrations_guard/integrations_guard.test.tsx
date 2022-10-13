/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { IntegrationsGuard } from '.';
import { TestProvidersComponent } from '../../common/mocks/test_providers';
import { useTIDocumentationLink } from '../../hooks/use_documentation_link';
import { useIntegrationsPageLink } from '../../hooks/use_integrations_page_link';
import { useIndicatorsTotalCount } from '../../modules/indicators';

jest.mock('../../modules/indicators/hooks/use_total_count');
jest.mock('../../hooks/use_integrations_page_link');
jest.mock('../../hooks/use_documentation_link');

describe('checking if the page should be visible (based on indicator count)', () => {
  describe('when indicator count is being loaded', () => {
    it('should render nothing at all', () => {
      (
        useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
      ).mockReturnValue({
        count: 0,
        isLoading: true,
      });
      (
        useIntegrationsPageLink as jest.MockedFunction<typeof useIntegrationsPageLink>
      ).mockReturnValue('');
      (
        useTIDocumentationLink as jest.MockedFunction<typeof useTIDocumentationLink>
      ).mockReturnValue('');

      const { asFragment } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
        wrapper: TestProvidersComponent,
      });

      expect(asFragment()).toMatchSnapshot('loading');
    });
  });

  describe('when indicator count is loaded and there are no indicators', () => {
    it('should render empty page when no indicators are found', async () => {
      (
        useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
      ).mockReturnValue({
        count: 0,
        isLoading: false,
      });
      (
        useIntegrationsPageLink as jest.MockedFunction<typeof useIntegrationsPageLink>
      ).mockReturnValue('');
      (
        useTIDocumentationLink as jest.MockedFunction<typeof useTIDocumentationLink>
      ).mockReturnValue('');

      const { asFragment } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
        wrapper: TestProvidersComponent,
      });
      expect(asFragment()).toMatchSnapshot('no indicators');
    });
  });

  describe('when loading is done and we have some indicators', () => {
    it('should render indicators table', async () => {
      (
        useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
      ).mockReturnValue({
        count: 7,
        isLoading: false,
      });

      const { asFragment } = render(<IntegrationsGuard>should be restricted</IntegrationsGuard>, {
        wrapper: TestProvidersComponent,
      });
      expect(asFragment()).toMatchSnapshot('indicators are present');
    });
  });
});
