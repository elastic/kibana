/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProvider } from '../../mocks/test_provider';
import { CreateIntegrationCardButton } from './create_integration_card_button';
import { mockServices } from '../../services/mocks/services';

const renderOptions = { wrapper: TestProvider };

describe('CreateIntegrationCardButton', () => {
  describe('when not compressed (default)', () => {
    let element: React.ReactElement;

    beforeEach(() => {
      element = <CreateIntegrationCardButton />;
    });

    it('should render the link button', () => {
      const result = render(element, renderOptions);
      expect(result.queryByTestId('createIntegrationLink')).toBeInTheDocument();
    });

    it('should render the sub-title', () => {
      const result = render(element, renderOptions);
      expect(
        result.queryByText('Create a custom one to fit your requirements')
      ).toBeInTheDocument();
    });

    it('should navigate when button clicked', () => {
      const url = '/app/integrations';
      mockServices.application.getUrlForApp.mockReturnValueOnce(url);

      const result = render(element, renderOptions);
      result.queryByTestId('createIntegrationLink')?.click();

      expect(mockServices.application.navigateToUrl).toHaveBeenCalledWith(url);
    });
  });

  describe('when compressed', () => {
    let element: React.ReactElement;

    beforeEach(() => {
      element = <CreateIntegrationCardButton compressed />;
    });

    it('should render the link button', () => {
      const result = render(element, renderOptions);
      expect(result.queryByTestId('createIntegrationLink')).toBeInTheDocument();
    });

    it('should not render the sub-title', () => {
      const result = render(element, renderOptions);
      expect(
        result.queryByText('Create a custom one to fit your requirements')
      ).not.toBeInTheDocument();
    });

    it('should navigate when button clicked', () => {
      const url = '/app/integrations';
      mockServices.application.getUrlForApp.mockReturnValueOnce(url);

      const result = render(element, renderOptions);

      result.queryByTestId('createIntegrationLink')?.click();
      expect(mockServices.application.navigateToUrl).toHaveBeenCalledWith(url);
    });
  });
});
