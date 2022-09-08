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
import { RiskyScoreUpgradeButton } from './risky_score_upgrade_button';
import {
  RiskScoreModuleName,
  upgradeHostRiskScoreModule,
  upgradeUserRiskScoreModule,
} from './utils';

jest.mock('./utils');

describe('RiskyScoreUpgradeButton', () => {
  const mockRefetch = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Host', () => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskyScoreUpgradeButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      expect(screen.getByTestId('risk-score-upgrade')).toBeInTheDocument();
      expect(screen.getByTestId('risk-score-upgrade')).toHaveTextContent('Upgrade');
    });

    it('Triggers the right installer', async () => {
      render(
        <TestProviders>
          <RiskyScoreUpgradeButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-upgrade'));
      });

      expect(upgradeHostRiskScoreModule).toHaveBeenCalled();
    });

    it('Update button state while upgrading', async () => {
      render(
        <TestProviders>
          <RiskyScoreUpgradeButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('risk-score-upgrade'));

      await waitFor(() => {
        expect(screen.getByTestId('risk-score-upgrade')).toHaveTextContent('Upgrading');
      });
    });

    it('Refretch the module when upgrade finished', async () => {
      render(
        <TestProviders>
          <RiskyScoreUpgradeButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-upgrade'));
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('User', () => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskyScoreUpgradeButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      expect(screen.getByTestId('risk-score-upgrade')).toBeInTheDocument();
      expect(screen.getByTestId('risk-score-upgrade')).toHaveTextContent('Upgrade');
    });

    it('Triggers the right installer', async () => {
      render(
        <TestProviders>
          <RiskyScoreUpgradeButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-upgrade'));
      });

      expect(upgradeUserRiskScoreModule).toHaveBeenCalled();
    });

    it('Update button state while upgrading', async () => {
      render(
        <TestProviders>
          <RiskyScoreUpgradeButton refetch={mockRefetch} moduleName={RiskScoreModuleName.User} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('risk-score-upgrade'));

      await waitFor(() => {
        expect(screen.getByTestId('risk-score-upgrade')).toHaveTextContent('Upgrading');
      });
    });

    it('Refretch the module when upgrade finished', async () => {
      render(
        <TestProviders>
          <RiskyScoreUpgradeButton refetch={mockRefetch} moduleName={RiskScoreModuleName.Host} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('risk-score-upgrade'));
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
