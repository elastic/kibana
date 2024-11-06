/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { ScheduleRiskEngineCallout } from './schedule_risk_engine_callout';
import { RiskEngineStatusEnum } from '../../../../../common/api/entity_analytics';

const oneHourFromNow = () => {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return date;
};

const thirtyMinutesFromNow = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);
  return date;
};

const mockUseRiskEngineStatus = jest.fn();
jest.mock('../../../api/hooks/use_risk_engine_status', () => {
  const originalModule = jest.requireActual('../../../api/hooks/use_risk_engine_status');

  return {
    ...originalModule,
    useRiskEngineStatus: () => mockUseRiskEngineStatus(),
  };
});

const mockScheduleNowRiskEngine = jest.fn();
jest.mock('../../../api/hooks/use_schedule_now_risk_engine_mutation', () => {
  return {
    useScheduleNowRiskEngineMutation: () => ({
      isLoading: false,
      mutate: mockScheduleNowRiskEngine,
    }),
  };
});

jest.useFakeTimers();

describe('ScheduleRiskEngineCallout', () => {
  it('should show the remaining time for the next risk engine run', async () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: true,
        risk_engine_status: RiskEngineStatusEnum.ENABLED,
        risk_engine_task_status: {
          status: 'idle',
          runAt: oneHourFromNow().toISOString(),
        },
      },
    });

    const { getByText } = render(<ScheduleRiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(getByText('The next scheduled engine run is in:')).toBeInTheDocument();
    await waitFor(() => {
      expect(getByText('an hour')).toBeInTheDocument();
    });
  });

  it('should show "now running" status when the risk engine status is "running"', () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: true,
        risk_engine_status: RiskEngineStatusEnum.ENABLED,
        risk_engine_task_status: {
          status: 'running',
          runAt: oneHourFromNow().toISOString(),
        },
      },
    });

    const { getByText } = render(<ScheduleRiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(getByText('Now running')).toBeInTheDocument();
  });

  it('should show "now running" status when the next schedule run is in the past', () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: true,
        risk_engine_status: RiskEngineStatusEnum.ENABLED,
        risk_engine_task_status: {
          status: 'idle',
          runAt: new Date().toISOString(), // past date
        },
      },
    });

    jest.advanceTimersByTime(100); // advance time

    const { getByText } = render(<ScheduleRiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(getByText('Now running')).toBeInTheDocument();
  });

  it('should update the count down time when time has passed', () => {
    mockUseRiskEngineStatus.mockReturnValueOnce({
      data: {
        isNewRiskScoreModuleInstalled: true,
        risk_engine_status: RiskEngineStatusEnum.ENABLED,
        risk_engine_task_status: {
          status: 'idle',
          runAt: oneHourFromNow(),
        },
      },
    });

    const { getByText, rerender } = render(<ScheduleRiskEngineCallout />, {
      wrapper: TestProviders,
    });
    expect(getByText('an hour')).toBeInTheDocument();

    // simulate useQuery re-render after fetching data
    mockUseRiskEngineStatus.mockReturnValueOnce({
      data: {
        isNewRiskScoreModuleInstalled: true,
        risk_engine_status: RiskEngineStatusEnum.ENABLED,
        risk_engine_task_status: {
          status: 'idle',
          runAt: thirtyMinutesFromNow(),
        },
      },
    });
    rerender(<ScheduleRiskEngineCallout />);

    expect(getByText('30 minutes')).toBeInTheDocument();
  });

  it('should call the run risk engine api when button is clicked', () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: true,
        risk_engine_status: RiskEngineStatusEnum.ENABLED,
        risk_engine_task_status: {
          status: 'idle',
          runAt: new Date().toISOString(), // past date
        },
      },
    });

    const { getByText } = render(<ScheduleRiskEngineCallout />, {
      wrapper: TestProviders,
    });

    fireEvent.click(getByText('Recalculate entity risk scores now'));

    expect(mockScheduleNowRiskEngine).toHaveBeenCalled();
  });

  it('should not show the callout if the risk engine is not installed', () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: false,
      },
    });

    const { queryByTestId } = render(<ScheduleRiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('risk-engine-callout')).toBeNull();
  });

  it('should not show the callout if the risk engine is disabled', () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: true,
        risk_engine_status: RiskEngineStatusEnum.DISABLED,
      },
    });

    const { queryByTestId } = render(<ScheduleRiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('risk-engine-callout')).toBeNull();
  });
});
