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
import { RiskyScoreRestartButton } from './risky_score_restart_button';
import { RiskScoreModuleName, restartRiskScoreTransforms } from './utils';

jest.mock('./utils');

describe('RiskyScoreRestartButton', () => {
  const mockRefetch = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Host', () => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      expect(screen.getByTestId('risk-score-restart')).toBeInTheDocument();
      expect(screen.getByTestId('risk-score-restart')).toHaveTextContent('Restart');
    });

    it('Triggers the right installer', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-restart'));
      });

      expect((restartRiskScoreTransforms as jest.Mock).mock.calls[0][0].moduleName).toEqual(
        RiskScoreModuleName.Host
      );
    });

    it('Update button state while restarting', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('risk-score-restart'));

      await waitFor(() => {
        expect(screen.getByTestId('risk-score-restart')).toHaveTextContent('Restarting');
      });
    });

    it('Refretch the module when restart finished', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-restart'));
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('User', () => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      expect(screen.getByTestId('risk-score-restart')).toBeInTheDocument();
      expect(screen.getByTestId('risk-score-restart')).toHaveTextContent('Restart');
    });

    it('Triggers the right installer', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-restart'));
      });

      expect((restartRiskScoreTransforms as jest.Mock).mock.calls[0][0].moduleName).toEqual(
        RiskScoreModuleName.User
      );
    });

    it('Update button state while restarting', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('risk-score-restart'));

      await waitFor(() => {
        expect(screen.getByTestId('risk-score-restart')).toHaveTextContent('Restarting');
      });
    });

    it('Refretch the module when restart finished', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-restart'));
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
