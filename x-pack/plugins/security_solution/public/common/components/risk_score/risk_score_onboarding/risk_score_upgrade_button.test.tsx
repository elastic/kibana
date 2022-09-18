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
import { TestProviders } from '../../../mock/test_providers';
import { RiskScoreUpgradeButton } from './risk_score_upgrade_button';
import { upgradeHostRiskScoreModule, upgradeUserRiskScoreModule } from './utils';

jest.mock('./utils');

describe('RiskScoreUpgradeButton', () => {
  const mockRefetch = jest.fn();
  const timerange = {
    from: 'mockStartDate',
    to: 'mockEndDate',
  };
  const hostTestProps = {
    refetch: mockRefetch,
    riskScoreEntity: RiskScoreEntity.host,
    timerange,
    title: 'upgrade',
  };
  const userTestProps = {
    refetch: mockRefetch,
    riskScoreEntity: RiskScoreEntity.user,
    timerange,
    title: 'upgrade',
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Host', () => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...hostTestProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('host-risk-score-upgrade')).toBeInTheDocument();
      expect(screen.getByTestId('host-risk-score-upgrade')).toHaveTextContent(hostTestProps.title);
    });

    it('Triggers the confirmation modal before upgrading', async () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...hostTestProps} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('host-risk-score-upgrade'));
      });

      expect(screen.getByTestId('host-risk-score-upgrade-confirmation-modal')).toBeInTheDocument();
      await act(async () => {
        await userEvent.click(screen.getByText('Erase data and Upgrade'));
      });

      expect(
        screen.queryByTestId('host-risk-score-upgrade-confirmation-modal')
      ).not.toBeInTheDocument();

      expect(upgradeUserRiskScoreModule).not.toHaveBeenCalled();
      expect(upgradeHostRiskScoreModule).toHaveBeenCalled();
    });

    it('Shows doc link in the confirmation modal', async () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...hostTestProps} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('host-risk-score-upgrade'));
      });

      expect(screen.getByText('Preserve data')).toHaveProperty(
        'href',
        'https://www.elastic.co/guide/en/security/current/host-risk-score.html'
      );
    });

    it('Update button state while upgrading', async () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...hostTestProps} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('host-risk-score-upgrade'));
      userEvent.click(screen.getByText('Erase data and Upgrade'));
      await waitFor(() => {
        expect(screen.getByTestId('host-risk-score-upgrade')).toHaveProperty('disabled', true);
      });
    });
  });

  describe('User', () => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...userTestProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('user-risk-score-upgrade')).toBeInTheDocument();
      expect(screen.getByTestId('user-risk-score-upgrade')).toHaveTextContent(userTestProps.title);
    });

    it('Triggers the confirmation modal before upgrading', async () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...userTestProps} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('user-risk-score-upgrade'));
      });

      expect(screen.getByTestId('user-risk-score-upgrade-confirmation-modal')).toBeInTheDocument();
      await act(async () => {
        await userEvent.click(screen.getByText('Erase data and Upgrade'));
      });

      expect(
        screen.queryByTestId('user-risk-score-upgrade-confirmation-modal')
      ).not.toBeInTheDocument();
      expect(upgradeHostRiskScoreModule).not.toHaveBeenCalled();
      expect(upgradeUserRiskScoreModule).toHaveBeenCalled();
    });

    it('Shows doc link in the confirmation modal', async () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...userTestProps} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('user-risk-score-upgrade'));
      });

      expect(screen.getByText('Preserve data')).toHaveProperty(
        'href',
        'https://www.elastic.co/guide/en/security/current/user-risk-score.html'
      );
    });

    it('Update button state while upgrading', async () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...userTestProps} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('user-risk-score-upgrade'));
      userEvent.click(screen.getByText('Erase data and Upgrade'));
      await waitFor(() => {
        expect(screen.getByTestId('user-risk-score-upgrade')).toHaveProperty('disabled', true);
      });
    });
  });
});
