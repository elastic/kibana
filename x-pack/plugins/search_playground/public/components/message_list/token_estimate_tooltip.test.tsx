/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { TokenEstimateTooltip } from './token_estimate_tooltip';

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
  });

  it('displays total tokens and model limit if available', () => {
    const button = screen.getByTestId('token-tooltip-button');
    fireEvent.click(button);
    const panel = screen.getByTestId('token-tooltip-breakdown-2');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveTextContent('150');
  });

  it('displays learn more link', () => {
    const button = screen.getByTestId('token-tooltip-button');
    fireEvent.click(button);
    const link = screen.getByTestId('context-optimization-documentation-link');
    expect(link).toBeInTheDocument();
  });
});
