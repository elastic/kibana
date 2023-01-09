/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomaliesNetworkTable } from './anomalies_network_table';
import { TestProviders } from '../../../mock';
import React from 'react';
import { useQueryToggle } from '../../../containers/query_toggle';
import { useAnomaliesTableData } from '../anomaly/use_anomalies_table_data';
import { NetworkType } from '../../../../explore/network/store/model';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { FlowTarget } from '../../../../../common/search_strategy';
import { fireEvent, render } from '@testing-library/react';
import { mockAnomalies } from '../mock';
import { useInstalledSecurityJobsNamesById } from '../hooks/use_installed_security_jobs';
import { useMlHref } from '@kbn/ml-plugin/public';

jest.mock('../../../containers/query_toggle');
jest.mock('../anomaly/use_anomalies_table_data');
jest.mock('../../../../../common/machine_learning/has_ml_user_permissions');
jest.mock('../hooks/use_installed_security_jobs');
jest.mock('@kbn/ml-plugin/public');

const mockUseQueryToggle = useQueryToggle as jest.Mock;
const mockUseAnomaliesTableData = useAnomaliesTableData as jest.Mock;
const mockUseInstalledSecurityJobsNamesById = useInstalledSecurityJobsNamesById as jest.Mock;
const mockUseMlHref = useMlHref as jest.Mock;

const mockSetToggle = jest.fn();

(hasMlUserPermissions as jest.Mock).mockReturnValue(true);
mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
mockUseMlHref.mockReturnValue('http://test');
mockUseInstalledSecurityJobsNamesById.mockReturnValue({
  loading: false,
  jobNameById: {},
});

const testProps = {
  startDate: '2019-07-17T20:00:00.000Z',
  endDate: '2019-07-18T20:00:00.000Z',
  flowTarget: FlowTarget.destination,
  narrowDateRange: jest.fn(),
  skip: false,
  type: NetworkType.page,
};

describe('Anomalies network table', () => {
  it('renders job name when available', () => {
    const anomaly = {
      ...mockAnomalies.anomalies[0],
      entityValue: '127.0.0.1',
      entityName: 'source.ip',
    };
    const jobName = 'job_name';

    mockUseAnomaliesTableData.mockReturnValue([
      false,
      {
        anomalies: [anomaly],
        interval: '10',
      },
    ]);
    mockUseInstalledSecurityJobsNamesById.mockReturnValue({
      loading: false,
      jobNameById: { [anomaly.jobId]: jobName },
    });

    const { getByTestId } = render(<AnomaliesNetworkTable {...testProps} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId(`explorer-link-${anomaly.jobId}`).textContent).toContain(jobName);
  });

  describe('toggle query', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseAnomaliesTableData.mockReturnValue([
        false,
        {
          anomalies: [],
          interval: '10',
        },
      ]);
    });

    test('toggleQuery updates toggleStatus', () => {
      const { getByTestId } = render(<AnomaliesNetworkTable {...testProps} />, {
        wrapper: TestProviders,
      });
      expect(mockUseAnomaliesTableData.mock.calls[0][0].skip).toEqual(false);
      fireEvent.click(getByTestId('query-toggle-header'));
      expect(mockSetToggle).toBeCalledWith(false);
      expect(mockUseAnomaliesTableData.mock.calls[1][0].skip).toEqual(true);
    });

    test('toggleStatus=true, do not skip', () => {
      render(<AnomaliesNetworkTable {...testProps} />, {
        wrapper: TestProviders,
      });

      expect(mockUseAnomaliesTableData.mock.calls[0][0].skip).toEqual(false);
    });

    test('toggleStatus=true, render components', () => {
      const { queryByTestId } = render(<AnomaliesNetworkTable {...testProps} />, {
        wrapper: TestProviders,
      });
      expect(queryByTestId('network-anomalies-table')).toBeInTheDocument();
    });

    test('toggleStatus=false, do not render components', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      const { queryByTestId } = render(<AnomaliesNetworkTable {...testProps} />, {
        wrapper: TestProviders,
      });
      expect(queryByTestId('network-anomalies-table')).not.toBeInTheDocument();
    });

    test('toggleStatus=false, skip', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      render(<AnomaliesNetworkTable {...testProps} />, {
        wrapper: TestProviders,
      });

      expect(mockUseAnomaliesTableData.mock.calls[0][0].skip).toEqual(true);
    });
  });
});
