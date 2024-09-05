/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UpdateQueryInFormButton } from '.';

const mockUseAssistantContext = { codeBlockRef: { current: jest.fn() } };
jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: () => mockUseAssistantContext,
}));

describe('UpdateQueryInFormButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls codeBlockRef callback on click', () => {
    const testQuery = 'from auditbeat* | limit 10';
    render(<UpdateQueryInFormButton query={testQuery} />);

    userEvent.click(screen.getByTestId('update-query-in-form-button'));

    expect(mockUseAssistantContext.codeBlockRef.current).toHaveBeenCalledWith(testQuery);
  });
});
