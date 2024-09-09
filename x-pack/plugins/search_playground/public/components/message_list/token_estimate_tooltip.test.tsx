/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { TokenEstimateTooltip } from './token_estimate_tooltip';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../hooks/use_llms_models', () => ({
  useLLMsModels: () => [
    { value: 'model1', promptTokenLimit: 100 },
    { value: 'model2', promptTokenLimit: 200 },
  ],
}));

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('TokenEstimateTooltip component tests', () => {
  describe('when context and total tokens are provided', () => {
    beforeEach(() => {
      render(
        <IntlProvider locale="en">
          <MockFormProvider>
            <TokenEstimateTooltip context={50} total={150} />
          </MockFormProvider>
        </IntlProvider>
      );
    });

    it('toggles tooltip visibility when button is clicked', () => {
      const button = screen.getByTestId('token-tooltip-button');
      expect(screen.queryByTestId('token-tooltip-title')).not.toBeInTheDocument();
      fireEvent.click(button);
      expect(screen.queryByTestId('token-tooltip-title')).toBeInTheDocument();
    });

    it('displays context and instruction tokens in breakdown', () => {
      const button = screen.getByTestId('token-tooltip-button');
      fireEvent.click(button);
      const panel = screen.getByTestId('token-tooltip-breakdown-1');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveTextContent('50'); // context tokens
      expect(panel).toHaveTextContent('100'); // instruction tokens
      expect(screen.queryByTestId('clipped-tokens-description')).not.toBeInTheDocument();
    });

    it('displays learn more link', () => {
      const button = screen.getByTestId('token-tooltip-button');
      fireEvent.click(button);
      const link = screen.getByTestId('context-optimization-documentation-link');
      expect(link).toBeInTheDocument();
    });
  });

  describe('when context is clipped', () => {
    beforeEach(() => {
      render(
        <IntlProvider locale="en">
          <MockFormProvider>
            <TokenEstimateTooltip context={100} total={150} clipped={1000} />
          </MockFormProvider>
        </IntlProvider>
      );
    });

    it('displays clipped context tokens in breakdown', () => {
      const button = screen.getByTestId('token-tooltip-button');
      fireEvent.click(button);
      const panel = screen.getByTestId('clipped-tokens-callout');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveTextContent('1,000');
      expect(screen.getByTestId('clipped-tokens-callout')).toBeInTheDocument();
    });
  });
});
