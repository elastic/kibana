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

describe('When empty prompt is loaded', () => {
  beforeEach(() => {
    render(<AddEmptyPrompt />);
  });

  it('should display the description for creation of the first inference endpoint', () => {
    expect(
      screen.getByText(
        /Inference endpoints enable you to perform inference tasks using NLP models provided by third-party services/
      )
    ).toBeInTheDocument();
  });

  it('should have a learn-more link', () => {
    const learnMoreLink = screen.getByTestId('learn-how-to-create-inference-endpoints');
    expect(learnMoreLink).toBeInTheDocument();
  });

  it('should have a view-your-models link', () => {
    const learnMoreLink = screen.getByTestId('view-your-models');
    expect(learnMoreLink).toBeInTheDocument();
  });

  it('should have a semantic-search-with-elser link', () => {
    const learnMoreLink = screen.getByTestId('semantic-search-with-elser');
    expect(learnMoreLink).toBeInTheDocument();
  });

  it('should have a semantic-search-with-e5 link', () => {
    const learnMoreLink = screen.getByTestId('semantic-search-with-e5');
    expect(learnMoreLink).toBeInTheDocument();
  });
});
