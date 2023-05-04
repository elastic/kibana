/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { loadGlobalConnectorExecutionKPIAggregations } from '../../../lib/action_connector_api/load_execution_kpi_aggregations';
import { ConnectorEventLogListKPI } from './actions_connectors_event_log_list_kpi';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      notifications: { toast: { addDanger: jest.fn() } },
    },
  }),
}));

jest.mock('../../../lib/action_connector_api/load_execution_kpi_aggregations', () => ({
  loadGlobalConnectorExecutionKPIAggregations: jest.fn(),
}));

jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockKpiResponse = {
  success: 4,
  unknown: 0,
  failure: 60,
  warning: 10,
};

const loadGlobalExecutionKPIAggregationsMock =
  loadGlobalConnectorExecutionKPIAggregations as unknown as jest.MockedFunction<any>;

describe('actions_connectors_event_log_list_kpi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
    loadGlobalExecutionKPIAggregationsMock.mockResolvedValue(mockKpiResponse);
  });

  it('renders correctly', async () => {
    const wrapper = mountWithIntl(
      <ConnectorEventLogListKPI
        dateStart="now-24h"
        dateEnd="now"
        loadGlobalConnectorExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="connectorEventLogKpi-successOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual('--');
    expect(
      wrapper
        .find('[data-test-subj="connectorEventLogKpi-warningOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual('--');
    expect(
      wrapper
        .find('[data-test-subj="connectorEventLogKpi-failureOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual('--');

    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadGlobalConnectorExecutionKPIAggregations).toHaveBeenCalledWith(
      expect.objectContaining({
        message: undefined,
        outcomeFilter: undefined,
      })
    );

    expect(
      wrapper
        .find('[data-test-subj="connectorEventLogKpi-successOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual(`${mockKpiResponse.success}`);
    expect(
      wrapper
        .find('[data-test-subj="connectorEventLogKpi-warningOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual(`${mockKpiResponse.warning}`);
    expect(
      wrapper
        .find('[data-test-subj="connectorEventLogKpi-failureOutcome"] .euiStat__title')
        .first()
        .text()
    ).toEqual(`${mockKpiResponse.failure}`);
  });

  it('calls KPI API with filters', async () => {
    const wrapper = mountWithIntl(
      <ConnectorEventLogListKPI
        dateStart="now-24h"
        dateEnd="now"
        message="test"
        outcomeFilter={['status: 123', 'test:456']}
        loadGlobalConnectorExecutionKPIAggregations={loadGlobalExecutionKPIAggregationsMock}
      />
    );

    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadGlobalExecutionKPIAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'test',
        outcomeFilter: ['status: 123', 'test:456'],
      })
    );
  });
});
