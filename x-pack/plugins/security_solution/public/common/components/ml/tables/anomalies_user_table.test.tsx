/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AnomaliesUserTable } from './anomalies_user_table';
import { TestProviders } from '../../../mock';
import React from 'react';
import { useQueryToggle } from '../../../containers/query_toggle';
import { useAnomaliesTableData } from '../anomaly/use_anomalies_table_data';
import { UsersType } from '../../../../explore/users/store/model';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { fireEvent, render } from '@testing-library/react';
import { useInstalledSecurityJobNameById } from '../hooks/use_installed_security_jobs';
import { mockAnomalies } from '../mock';
import { useMlHref } from '@kbn/ml-plugin/public';

jest.mock('../../../containers/query_toggle');
jest.mock('../anomaly/use_anomalies_table_data');
jest.mock('../../../../../common/machine_learning/has_ml_user_permissions');
jest.mock('../hooks/use_installed_security_jobs');
jest.mock('@kbn/ml-plugin/public');

const mockUseQueryToggle = useQueryToggle as jest.Mock;
const mockUseAnomaliesTableData = useAnomaliesTableData as jest.Mock;
const mockUseInstalledSecurityJobNameById = useInstalledSecurityJobNameById as jest.Mock;
const mockUseMlHref = useMlHref as jest.Mock;

const mockSetToggle = jest.fn();

(hasMlUserPermissions as jest.Mock).mockReturnValue(true);
mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
mockUseMlHref.mockReturnValue('http://test');
mockUseInstalledSecurityJobNameById.mockReturnValue({
  loading: false,
  jobNameById: {},
});

const userName = 'cool_guy';
const testProps = {
  startDate: '2019-07-17T20:00:00.000Z',
  endDate: '2019-07-18T20:00:00.000Z',
  narrowDateRange: jest.fn(),
  userName,
  skip: false,
  type: UsersType.page,
};

describe('Anomalies user table', () => {
  it('renders job name when available', () => {
    const anomaly = {
      ...mockAnomalies.anomalies[0],
      entityValue: userName,
      entityName: 'user.name',
    };
    const jobName = 'job_name';

    mockUseAnomaliesTableData.mockReturnValue([
      false,
      {
        anomalies: [anomaly],
        interval: '10',
      },
    ]);

    mockUseAnomaliesTableData.mockReturnValue([
      false,
      {
        anomalies: [anomaly],
        interval: '10',
      },
    ]);
    mockUseInstalledSecurityJobNameById.mockReturnValue({
      loading: false,
      jobNameById: { [anomaly.jobId]: jobName },
    });

    const { getByTestId } = render(<AnomaliesUserTable {...testProps} />, {
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
      const { getByTestId } = render(<AnomaliesUserTable {...testProps} />, {
        wrapper: TestProviders,
      });
      expect(mockUseAnomaliesTableData.mock.calls[0][0].skip).toEqual(false);
      fireEvent.click(getByTestId('query-toggle-header'));
      expect(mockSetToggle).toBeCalledWith(false);
      expect(mockUseAnomaliesTableData.mock.calls[1][0].skip).toEqual(true);
    });

    test('toggleStatus=true, do not skip', () => {
      render(<AnomaliesUserTable {...testProps} />, {
        wrapper: TestProviders,
      });

      expect(mockUseAnomaliesTableData.mock.calls[0][0].skip).toEqual(false);
    });

    test('toggleStatus=true, render components', () => {
      const { queryByTestId } = render(<AnomaliesUserTable {...testProps} />, {
        wrapper: TestProviders,
      });
      expect(queryByTestId('user-anomalies-table')).toBeInTheDocument();
    });

    test('toggleStatus=false, do not render components', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      const { queryByTestId } = render(<AnomaliesUserTable {...testProps} />, {
        wrapper: TestProviders,
      });
      expect(queryByTestId('user-anomalies-table')).not.toBeInTheDocument();
    });

    test('toggleStatus=false, skip', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      render(<AnomaliesUserTable {...testProps} />, {
        wrapper: TestProviders,
      });

      expect(mockUseAnomaliesTableData.mock.calls[0][0].skip).toEqual(true);
    });
  });
});
