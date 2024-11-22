/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';

import { AiAssistant } from '.';

jest.mock('../../../../assistant/use_assistant_availability', () => ({
  useAssistantAvailability: jest.fn(),
}));

const useAssistantAvailabilityMock = useAssistantAvailability as jest.Mock;

describe('AiAssistant', () => {
  beforeEach(() => {
    useAssistantAvailabilityMock.mockReturnValue({ hasAssistantPrivilege: true });
  });
  it('does not render chat component when does not have hasAssistantPrivilege', () => {
    useAssistantAvailabilityMock.mockReturnValue({ hasAssistantPrivilege: false });

    const { container } = render(<AiAssistant getFields={jest.fn()} setFieldValue={jest.fn()} />, {
      wrapper: TestProviders,
    });

    expect(container).toBeEmptyDOMElement();
  });
  it('renders chat component when has hasAssistantPrivilege', () => {
    render(<AiAssistant getFields={jest.fn()} setFieldValue={jest.fn()} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('newChatLink')).toBeInTheDocument();
  });
});
