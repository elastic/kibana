/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { AssistantHeaderLink } from './header_link';

const mockShowAssistantOverlay = jest.fn();
const mockAssistantAvailability = jest.fn(() => ({
  hasAssistantPrivilege: true,
}));
jest.mock('@kbn/elastic-assistant/impl/assistant_context', () => ({
  useAssistantContext: () => ({
    assistantAvailability: mockAssistantAvailability(),
    showAssistantOverlay: mockShowAssistantOverlay,
  }),
}));

describe('AssistantHeaderLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the header link text', () => {
    const { queryByText, queryByTestId } = render(<AssistantHeaderLink />);
    expect(queryByTestId('assistantHeaderLink')).toBeInTheDocument();
    expect(queryByText('AI Assistant')).toBeInTheDocument();
  });

  it('should not render the header link if not authorized', () => {
    mockAssistantAvailability.mockReturnValueOnce({ hasAssistantPrivilege: false });

    const { queryByText, queryByTestId } = render(<AssistantHeaderLink />);
    expect(queryByTestId('assistantHeaderLink')).not.toBeInTheDocument();
    expect(queryByText('AI Assistant')).not.toBeInTheDocument();
  });

  it('should call the assistant overlay to show on click', () => {
    const { queryByTestId } = render(<AssistantHeaderLink />);
    queryByTestId('assistantHeaderLink')?.click();
    expect(mockShowAssistantOverlay).toHaveBeenCalledTimes(1);
    expect(mockShowAssistantOverlay).toHaveBeenCalledWith({ showOverlay: true });
  });
});
