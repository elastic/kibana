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

import { RiskScoreEnableButton } from './risk_score_enable_button';
import { installRiskScoreModule } from './utils';

jest.mock('./utils');

describe('RiskScoreEnableButton', () => {
  const mockRefetch = jest.fn();
  const timerange = {
    from: 'mockStartDate',
    to: 'mockEndDate',
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe.each([[RiskScoreEntity.host], [RiskScoreEntity.user]])('%s', (riskScoreEntity) => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskScoreEnableButton
            refetch={mockRefetch}
            riskScoreEntity={riskScoreEntity}
            timerange={timerange}
          />
        </TestProviders>
      );

      expect(screen.getByTestId(`enable_${riskScoreEntity}_risk_score`)).toHaveTextContent(
        'Enable'
      );
    });

    it('Triggers the right installer', async () => {
      render(
        <TestProviders>
          <RiskScoreEnableButton
            refetch={mockRefetch}
            riskScoreEntity={riskScoreEntity}
            timerange={timerange}
          />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId(`enable_${riskScoreEntity}_risk_score`));
      });

      expect(installRiskScoreModule).toHaveBeenCalled();
    });

    it('Update button state while installing', async () => {
      render(
        <TestProviders>
          <RiskScoreEnableButton
            refetch={mockRefetch}
            riskScoreEntity={riskScoreEntity}
            timerange={timerange}
          />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId(`enable_${riskScoreEntity}_risk_score`));

      await waitFor(() => {
        expect(screen.getByTestId(`enable_${riskScoreEntity}_risk_score`)).toHaveProperty(
          'disabled',
          true
        );
      });
    });
  });
});
