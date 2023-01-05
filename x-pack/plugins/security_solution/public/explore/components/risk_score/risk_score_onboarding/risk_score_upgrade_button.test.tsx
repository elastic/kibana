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

  describe.each([
    [RiskScoreEntity.host, hostTestProps],
    [RiskScoreEntity.user, userTestProps],
  ])('%s', (riskScoreEntity, testProps) => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...testProps} />
        </TestProviders>
      );

      expect(screen.getByTestId(`${riskScoreEntity}-risk-score-upgrade`)).toBeInTheDocument();
      expect(screen.getByTestId(`${riskScoreEntity}-risk-score-upgrade`)).toHaveTextContent(
        testProps.title
      );
    });

    it('Triggers the confirmation modal before upgrading', async () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...testProps} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId(`${riskScoreEntity}-risk-score-upgrade`));
      });

      expect(
        screen.getByTestId(`${riskScoreEntity}-risk-score-upgrade-confirmation-modal`)
      ).toBeInTheDocument();
      await act(async () => {
        await userEvent.click(screen.getByText('Erase data and Upgrade'));
      });

      expect(
        screen.queryByTestId(`${riskScoreEntity}-risk-score-upgrade-confirmation-modal`)
      ).not.toBeInTheDocument();

      if (riskScoreEntity === RiskScoreEntity.user) {
        expect(upgradeUserRiskScoreModule).toHaveBeenCalled();
        expect(upgradeHostRiskScoreModule).not.toHaveBeenCalled();
      } else {
        expect(upgradeUserRiskScoreModule).not.toHaveBeenCalled();
        expect(upgradeHostRiskScoreModule).toHaveBeenCalled();
      }
    });

    it('Shows doc link in the confirmation modal', async () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...testProps} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId(`${riskScoreEntity}-risk-score-upgrade`));
      });

      expect(screen.getByText('Preserve data')).toHaveProperty(
        'href',
        `https://www.elastic.co/guide/en/security/current/${riskScoreEntity}-risk-score.html`
      );
    });

    it('Update button state while upgrading', async () => {
      render(
        <TestProviders>
          <RiskScoreUpgradeButton {...testProps} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId(`${riskScoreEntity}-risk-score-upgrade`));
      userEvent.click(screen.getByText('Erase data and Upgrade'));
      await waitFor(() => {
        expect(screen.getByTestId(`${riskScoreEntity}-risk-score-upgrade`)).toHaveProperty(
          'disabled',
          true
        );
      });
    });
  });
});
