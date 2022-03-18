/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { AnomaliesHostTable } from './anomalies_host_table';
import { TestProviders } from '../../../mock';
import React from 'react';
import { useQueryToggle } from '../../../containers/query_toggle';
import { useAnomaliesTableData } from '../anomaly/use_anomalies_table_data';
import { HostsType } from '../../../../hosts/store/model';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';

jest.mock('../../../containers/query_toggle');
jest.mock('../anomaly/use_anomalies_table_data');
jest.mock('../../../../../common/machine_learning/has_ml_user_permissions');

describe('Anomalies host table', () => {
  describe('toggle query', () => {
    const mockUseQueryToggle = useQueryToggle as jest.Mock;
    const mockUseAnomaliesTableData = useAnomaliesTableData as jest.Mock;
    const mockSetToggle = jest.fn();
    const testProps = {
      startDate: '2019-07-17T20:00:00.000Z',
      endDate: '2019-07-18T20:00:00.000Z',
      narrowDateRange: jest.fn(),
      skip: false,
      type: HostsType.page,
    };
    beforeEach(() => {
      jest.clearAllMocks();
      (hasMlUserPermissions as jest.Mock).mockReturnValue(true);
      mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
      mockUseAnomaliesTableData.mockReturnValue([
        false,
        {
          anomalies: [],
          interval: '10',
        },
      ]);
    });

    test('toggleQuery updates toggleStatus', () => {
      const wrapper = mount(<AnomaliesHostTable {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(mockUseAnomaliesTableData.mock.calls[0][0].skip).toEqual(false);
      wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
      expect(mockSetToggle).toBeCalledWith(false);
      expect(mockUseAnomaliesTableData.mock.calls[1][0].skip).toEqual(true);
    });

    test('toggleStatus=true, do not skip', () => {
      mount(<AnomaliesHostTable {...testProps} />, {
        wrappingComponent: TestProviders,
      });

      expect(mockUseAnomaliesTableData.mock.calls[0][0].skip).toEqual(false);
    });

    test('toggleStatus=true, render components', () => {
      const wrapper = mount(<AnomaliesHostTable {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="host-anomalies-table"]').exists()).toBe(true);
    });

    test('toggleStatus=false, do not render components', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      const wrapper = mount(<AnomaliesHostTable {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="host-anomalies-table"]').exists()).toBe(false);
    });

    test('toggleStatus=false, skip', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      mount(<AnomaliesHostTable {...testProps} />, {
        wrappingComponent: TestProviders,
      });

      expect(mockUseAnomaliesTableData.mock.calls[0][0].skip).toEqual(true);
    });
  });
});
