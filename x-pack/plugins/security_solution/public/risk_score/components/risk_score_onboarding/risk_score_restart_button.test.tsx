/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import { TestProviders } from '../../../common/mock';
import { RiskScoreRestartButton } from './risk_score_restart_button';

import { restartRiskScoreTransforms } from './utils';

jest.mock('./utils');

const mockRestartRiskScoreTransforms = restartRiskScoreTransforms as jest.Mock;

describe('RiskScoreRestartButton', () => {
  const mockRefetch = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe.each([[RiskScoreEntity.host], [RiskScoreEntity.user]])('%s', (riskScoreEntity) => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskScoreRestartButton refetch={mockRefetch} riskScoreEntity={riskScoreEntity} />
        </TestProviders>
      );

      expect(screen.getByTestId(`restart_${riskScoreEntity}_risk_score`)).toHaveTextContent(
        'Restart'
      );
    });

    it('calls restartRiskScoreTransforms with correct entity', async () => {
      render(
        <TestProviders>
          <RiskScoreRestartButton refetch={mockRefetch} riskScoreEntity={riskScoreEntity} />
        </TestProviders>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId(`restart_${riskScoreEntity}_risk_score`));
      });
      expect(mockRestartRiskScoreTransforms).toHaveBeenCalled();
      expect(mockRestartRiskScoreTransforms.mock.calls[0][0].riskScoreEntity).toEqual(
        riskScoreEntity
      );
    });

    it('Update button state while installing', async () => {
      render(
        <TestProviders>
          <RiskScoreRestartButton refetch={mockRefetch} riskScoreEntity={riskScoreEntity} />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId(`restart_${riskScoreEntity}_risk_score`));

      await waitFor(() => {
        expect(screen.getByTestId(`restart_${riskScoreEntity}_risk_score`)).toHaveProperty(
          'disabled',
          true
        );
      });
    });
  });
});
