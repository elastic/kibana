/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from '@testing-library/react-hooks';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ObservabilityActions, ObservabilityActionsProps } from './observability_actions';
import { inventoryThresholdAlert } from '../../../rules/fixtures/example_alerts';
import { RULE_DETAILS_PAGE_ID } from '../../rule_details/types';
import { createObservabilityRuleTypeRegistryMock } from '../../../rules/observability_rule_type_registry_mock';
import { TimelineNonEcsData } from '@kbn/timelines-plugin/common';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('../../../hooks/use_get_user_cases_permissions', () => ({
  useGetUserCasesPermissions: jest.fn(() => ({})),
}));

describe('ObservabilityActions component', () => {
  const setup = async (pageId: string) => {
    const props: ObservabilityActionsProps = {
      eventId: '6d4c6d74-d51a-495c-897d-88ced3b95e30',
      ecsData: {
        _id: '6d4c6d74-d51a-495c-897d-88ced3b95e30',
        _index: '.internal.alerts-observability.metrics.alerts-default-000001',
      },
      data: inventoryThresholdAlert as unknown as TimelineNonEcsData[],
      observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
      setEventsDeleted: jest.fn(),
      setFlyoutAlert: jest.fn(),
      id: pageId,
    };

    const wrapper = mountWithIntl(<ObservabilityActions {...props} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    return wrapper;
  };

  it('should hide "View rule details" menu item for rule page id', async () => {
    const wrapper = await setup(RULE_DETAILS_PAGE_ID);
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().length).toBe(0);
    expect(wrapper.find('[data-test-subj~="viewAlertDetails"]').hostNodes().length).toBe(1);
  });

  it('should show "View rule details" menu item', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().length).toBe(1);
    expect(wrapper.find('[data-test-subj~="viewAlertDetails"]').hostNodes().length).toBe(1);
  });

  it('should create a valid link for rule details page', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().length).toBe(1);
    expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().prop('href')).toBe(
      '/app/observability/alerts/rules/06f53080-0f91-11ed-9d86-013908b232ef'
    );
  });
});
