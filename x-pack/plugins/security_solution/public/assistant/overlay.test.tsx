/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { AssistantOverlay } from './overlay';

const mockAssistantAvailability = jest.fn(() => ({
  hasAssistantPrivilege: true,
}));
jest.mock('@kbn/elastic-assistant', () => ({
  AssistantOverlay: () => <div data-test-subj="assistantOverlay" />,
  useAssistantContext: () => ({
    assistantAvailability: mockAssistantAvailability(),
  }),
}));

jest.mock('../common/hooks/use_experimental_features');

describe('AssistantOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the header link text', () => {
    const { queryByTestId } = render(<AssistantOverlay />);
    expect(queryByTestId('assistantOverlay')).toBeInTheDocument();
  });

  it('should not render the header link if not authorized', () => {
    mockAssistantAvailability.mockReturnValueOnce({ hasAssistantPrivilege: false });

    const { queryByTestId } = render(<AssistantOverlay />);
    expect(queryByTestId('assistantOverlay')).not.toBeInTheDocument();
  });
});
