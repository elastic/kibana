/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { RiskEngineCallout } from './risk_engine_callout';

// jest.mock('../../../../common/utils/download_blob');

// jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
//   useKibana: () => ({
//     services: {
//       telemetry: {
//         reportAssetCriticalityCsvImported: jest.fn(),
//       },
//     },
//   }),
// }));

// describe('RiskEngineCallout', () => {
//   it('????', () => {
//     const { getByText } = render(<RiskEngineCallout />, {
//       wrapper: TestProviders,
//     });
//   });
// });

// WRITE UNIT TEST FOR RiskEngineCallout THAT IS INSIDE /Users/machadoum/workspace/kibana/x-pack/plugins/security_solution/public/entity_analytics/components/asset_criticality_file_uploader/components/risk_engine_callout.tsx

//   const { data: riskEngineStatus, isLoading: isRiskEngineStatusLoading } = useRiskEngineStatus();
// if (!riskEngineStatus?.isNewRiskScoreModuleInstalled) {

const mockUseRiskEngineStatus = jest.fn();
jest.mock('../../../api/hooks/use_risk_engine_status', () => {
  const originalModule = jest.requireActual('../../../api/hooks/use_risk_engine_status');

  return {
    ...originalModule,
    useRiskEngineStatus: () => mockUseRiskEngineStatus(),
  };
});

const OneHourFromNow = new Date();
OneHourFromNow.setHours(OneHourFromNow.getHours() + 1);

describe('RiskEngineCallout', () => {
  it.skip('renders', () => {
    mockUseRiskEngineStatus.mockReturnValue({ data: { isNewRiskScoreModuleInstalled: true } });
    const { getByText } = render(<RiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(getByText('Risk score')).toBeInTheDocument();
  });

  it('should show the remaining time for the next risk engine run', async () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: true,

        risk_engine_task_status: {
          status: 'idle',
          runAt: OneHourFromNow.toISOString(),
        },
      },
    });

    const { getByText } = render(<RiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(getByText('Next engine is schedule to run in:')).toBeInTheDocument();
    await waitFor(() => {
      expect(getByText('an hour')).toBeInTheDocument();
    });
  });

  it('should show is running status when the risk engine status is running', () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: true,

        risk_engine_task_status: {
          status: 'running',
          runAt: OneHourFromNow.toISOString(),
        },
      },
    });

    const { getByText } = render(<RiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(getByText('Now running')).toBeInTheDocument();
  });

  it('should show is running status when the next schedule run is in the past', () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: true,

        risk_engine_task_status: {
          status: 'idle',
          runAt: new Date().toISOString(), // past date
        },
      },
    });

    const { getByText } = render(<RiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(getByText('Now running')).toBeInTheDocument();
  });

  it.only('should update the count down time when time has passed', () => {
    // TODO
    mockUseRiskEngineStatus.mockReturnValue({
      data: {
        isNewRiskScoreModuleInstalled: true,

        risk_engine_task_status: {
          status: 'idle',
          runAt: OneHourFromNow, // past date
        },
      },
    });

    const { getByText } = render(<RiskEngineCallout />, {
      wrapper: TestProviders,
    });

    expect(getByText('na hours')).toBeInTheDocument();

    // after 30min

    expect(getByText('30 minutes')).toBeInTheDocument();
  });

  it.skip('should call the run risk engine api', () => {});
  it.skip('should refetch the status when the schedule run is called', () => {});
});
