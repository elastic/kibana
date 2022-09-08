/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { RiskyScoreEnableButton } from './risky_score_enable_button';
import {
  RiskScoreModuleName,
  installHostRiskScoreModule,
  installUserRiskScoreModule,
} from './utils';

jest.mock('./utils');

describe('RiskyScoreEnableButton', () => {
  const mockRefetch = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Host', () => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskyScoreEnableButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      expect(screen.getByTestId('risk-score-enable')).toBeInTheDocument();
      expect(screen.getByTestId('risk-score-enable')).toHaveTextContent('Enable');
    });

    it('Triggers the right installer', async () => {
      render(
        <TestProviders>
          <RiskyScoreEnableButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-enable'));
      });

      expect(installHostRiskScoreModule).toHaveBeenCalled();
    });

    it('Update button state while installing', async () => {
      render(
        <TestProviders>
          <RiskyScoreEnableButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('risk-score-enable'));

      await waitFor(() => {
        expect(screen.getByTestId('risk-score-enable')).toHaveTextContent('Enabling');
      });
    });

    it('Refretch the module when installation finished', async () => {
      render(
        <TestProviders>
          <RiskyScoreEnableButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-enable'));
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('User', () => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskyScoreEnableButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      expect(screen.getByTestId('risk-score-enable')).toBeInTheDocument();
      expect(screen.getByTestId('risk-score-enable')).toHaveTextContent('Enable');
    });

    it('Triggers the right installer', async () => {
      render(
        <TestProviders>
          <RiskyScoreEnableButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-enable'));
      });

      expect(installUserRiskScoreModule).toHaveBeenCalled();
    });

    it('Update button state while installing', async () => {
      render(
        <TestProviders>
          <RiskyScoreEnableButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('risk-score-enable'));

      await waitFor(() => {
        expect(screen.getByTestId('risk-score-enable')).toHaveTextContent('Enabling');
      });
    });

    it('Refretch the module when installation finished', async () => {
      render(
        <TestProviders>
          <RiskyScoreEnableButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-enable'));
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
