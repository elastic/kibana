/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { AddEmptyPrompt } from './add_empty_prompt';

import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';
import '@testing-library/jest-dom';
const setIsInferenceFlyoutVisibleMock = jest.fn();

describe('When empty prompt is loaded', () => {
  beforeEach(() => {
    render(<AddEmptyPrompt setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisibleMock} />);
  });

  it('should display the description for creation of the first inference endpoint', () => {
    expect(
      screen.getByText(
        /Inference endpoints streamline the deployment and management of machine learning models in Elasticsearch/
      )
    ).toBeInTheDocument();
  });

  it('should have a learn-more link', () => {
    const learnMoreLink = screen.getByTestId('learn-more-about-inference-endpoints');
    expect(learnMoreLink).toBeInTheDocument();
  });

  it('should have a view-your-models link', () => {
    const learnMoreLink = screen.getByTestId('view-your-models');
    expect(learnMoreLink).toBeInTheDocument();
  });

  it('should have a learn-more-about-elser link', () => {
    const learnMoreLink = screen.getByTestId('learn-more-about-elser');
    expect(learnMoreLink).toBeInTheDocument();
  });

  it('should have a learn-more-about-e5 link', () => {
    const learnMoreLink = screen.getByTestId('learn-more-about-e5');
    expect(learnMoreLink).toBeInTheDocument();
  });
});
