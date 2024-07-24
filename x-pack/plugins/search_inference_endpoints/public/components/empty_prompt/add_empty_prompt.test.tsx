/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
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
        /Connect to your third-party model provider to create an inference endpoint for semantic search./
      )
    ).toBeInTheDocument();
  });

  it('calls setIsInferenceFlyoutVisible when the addInferenceEndpoint button is clicked', async () => {
    fireEvent.click(screen.getByTestId('addEndpointButtonForEmptyPrompt'));
    expect(setIsInferenceFlyoutVisibleMock).toHaveBeenCalled();
  });
});
