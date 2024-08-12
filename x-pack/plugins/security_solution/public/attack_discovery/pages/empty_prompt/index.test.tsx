/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { EmptyPrompt } from '.';
import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../assistant/use_assistant_availability');

describe('EmptyPrompt', () => {
  const alertsCount = 20;
  const onGenerate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the user has the assistant privilege', () => {
    beforeEach(() => {
      (useAssistantAvailability as jest.Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });

      render(
        <TestProviders>
          <EmptyPrompt
            alertsCount={alertsCount}
            isLoading={false}
            isDisabled={false}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('renders the empty prompt avatar', () => {
      const emptyPromptAvatar = screen.getByTestId('emptyPromptAvatar');

      expect(emptyPromptAvatar).toBeInTheDocument();
    });

    it('renders the animated counter', () => {
      const emptyPromptAnimatedCounter = screen.getByTestId('emptyPromptAnimatedCounter');

      expect(emptyPromptAnimatedCounter).toBeInTheDocument();
    });

    it('renders the expected statement', () => {
      const emptyPromptAlertsWillBeAnalyzed = screen.getByTestId('emptyPromptAlertsWillBeAnalyzed');

      expect(emptyPromptAlertsWillBeAnalyzed).toHaveTextContent('alerts will be analyzed');
    });

    it('calls onGenerate when the generate button is clicked', () => {
      const generateButton = screen.getByTestId('generate');

      fireEvent.click(generateButton);

      expect(onGenerate).toHaveBeenCalled();
    });
  });

  describe('when the user does NOT have the assistant privilege', () => {
    it('disables the generate button when the user does NOT have the assistant privilege', () => {
      (useAssistantAvailability as jest.Mock).mockReturnValue({
        hasAssistantPrivilege: false, // <-- the user does NOT have the assistant privilege
        isAssistantEnabled: true,
      });

      render(
        <TestProviders>
          <EmptyPrompt
            alertsCount={alertsCount}
            isLoading={false}
            isDisabled={false}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );

      const generateButton = screen.getByTestId('generate');

      expect(generateButton).toBeDisabled();
    });
  });

  describe('when loading is true', () => {
    const isLoading = true;

    beforeEach(() => {
      (useAssistantAvailability as jest.Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });

      render(
        <TestProviders>
          <EmptyPrompt
            alertsCount={alertsCount}
            isLoading={isLoading}
            isDisabled={false}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('disables the generate button while loading', () => {
      const generateButton = screen.getByTestId('generate');

      expect(generateButton).toBeDisabled();
    });
  });

  describe('when isDisabled is true', () => {
    const isDisabled = true;

    beforeEach(() => {
      (useAssistantAvailability as jest.Mock).mockReturnValue({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
      });

      render(
        <TestProviders>
          <EmptyPrompt
            alertsCount={alertsCount}
            isLoading={false}
            isDisabled={isDisabled}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('disables the generate button when isDisabled is true', () => {
      const generateButton = screen.getByTestId('generate');

      expect(generateButton).toBeDisabled();
    });
  });
});
