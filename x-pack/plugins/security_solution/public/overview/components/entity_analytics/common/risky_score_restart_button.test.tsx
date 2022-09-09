/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { TestProviders } from '../../../../common/mock';
import { RiskyScoreRestartButton } from './risky_score_restart_button';
import { restartRiskScoreTransforms } from './utils';

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
          <RiskyScoreRestartButton refetch={mockRefetch} riskScoreEntity={RiskScoreEntity.host} />
        </TestProviders>
      );

      expect(screen.getByTestId('risk-score-restart')).toBeInTheDocument();
      expect(screen.getByTestId('risk-score-restart')).toHaveTextContent('Restart');
    });

    it('Triggers the right installer', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} riskScoreEntity={RiskScoreEntity.host} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-restart'));
      });

      expect((restartRiskScoreTransforms as jest.Mock).mock.calls[0][0].riskScoreEntity).toEqual(
        RiskScoreEntity.host
      );
    });

    it('Update button state while restarting', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} riskScoreEntity={RiskScoreEntity.host} />
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
          <RiskyScoreRestartButton refetch={mockRefetch} riskScoreEntity={RiskScoreEntity.host} />
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
          <RiskyScoreRestartButton refetch={mockRefetch} riskScoreEntity={RiskScoreEntity.user} />
        </TestProviders>
      );

      expect(screen.getByTestId('risk-score-restart')).toBeInTheDocument();
      expect(screen.getByTestId('risk-score-restart')).toHaveTextContent('Restart');
    });

    it('Triggers the right installer', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} riskScoreEntity={RiskScoreEntity.user} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-restart'));
      });

      expect((restartRiskScoreTransforms as jest.Mock).mock.calls[0][0].riskScoreEntity).toEqual(
        RiskScoreEntity.user
      );
    });

    it('Update button state while restarting', async () => {
      render(
        <TestProviders>
          <RiskyScoreRestartButton refetch={mockRefetch} riskScoreEntity={RiskScoreEntity.user} />
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
          <RiskyScoreRestartButton refetch={mockRefetch} riskScoreEntity={RiskScoreEntity.user} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-restart'));
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
