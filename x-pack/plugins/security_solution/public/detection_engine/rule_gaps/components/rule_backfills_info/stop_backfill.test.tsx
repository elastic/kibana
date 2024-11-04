/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useDeleteBackfill } from '../../api/hooks/use_delete_backfill';
import { StopBackfill } from './stop_backfill';
import { TestProviders } from '../../../../common/mock';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from '../../translations';
import type { BackfillRow } from '../../types';

jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../api/hooks/use_delete_backfill');
jest.mock('../../../../common/lib/kibana');

const mockUseAppToasts = useAppToasts as jest.Mock;
const mockUseDeleteBackfill = useDeleteBackfill as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

describe('StopBackfill', () => {
  const mockTelemetry = {
    reportManualRuleRunCancelJob: jest.fn(),
  };

  const addSuccess = jest.fn();
  const addError = jest.fn();

  const backfill = {
    id: 'backfill-id',
    total: 10,
    complete: 5,
    error: 1,
    duration: '1h',
    enabled: true,
    running: 1,
    pending: 1,
    timeout: 1,
    end: '2024-06-28T12:05:38.955Z',
    start: '2024-06-28T12:00:00.000Z',
    status: 'pending',
    created_at: '2024-06-28T12:05:42.572Z',
    space_id: 'default',
    rule: {
      name: 'Rule',
    },
    schedule: [
      {
        run_at: '2024-06-28T13:00:00.000Z',
        status: 'pending',
        interval: '1h',
      },
    ],
  } as BackfillRow;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAppToasts.mockReturnValue({
      addSuccess,
      addError,
    });

    mockUseKibana.mockReturnValue({
      services: {
        telemetry: mockTelemetry,
      },
    });
  });

  it('should call deleteBackfillMutation and telemetry when confirmed', async () => {
    mockUseDeleteBackfill.mockImplementation((options) => ({
      mutate: () => {
        if (options.onSuccess) {
          options.onSuccess();
        }
      },
    }));

    const { getByTestId } = render(<StopBackfill backfill={backfill} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(getByTestId('rule-backfills-delete-button'));
    fireEvent.click(getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(mockTelemetry.reportManualRuleRunCancelJob).toHaveBeenCalledWith({
        totalTasks: backfill.total,
        completedTasks: backfill.complete,
        errorTasks: backfill.error,
      });
    });

    expect(addSuccess).toHaveBeenCalledWith(i18n.BACKFILLS_TABLE_STOP_CONFIRMATION_SUCCESS);
  });

  it('should call addError on deleteBackfillMutation error', async () => {
    mockUseDeleteBackfill.mockImplementation((options) => ({
      mutate: () => {
        if (options.onError) {
          options.onError(new Error('Error stopping backfill'));
        }
      },
    }));

    const { getByTestId } = render(<StopBackfill backfill={backfill} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(getByTestId('rule-backfills-delete-button'));
    fireEvent.click(getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(addError).toHaveBeenCalledWith(expect.any(Error), {
        title: i18n.BACKFILLS_TABLE_STOP_CONFIRMATION_ERROR,
        toastMessage: 'Error stopping backfill',
      });
    });
  });
});
