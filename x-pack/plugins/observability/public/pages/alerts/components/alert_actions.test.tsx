/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from '@testing-library/react-hooks';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { AlertActions, Props } from './alert_actions';
import { inventoryThresholdAlert } from '../../../rules/fixtures/example_alerts';
import { RULE_DETAILS_PAGE_ID } from '../../rule_details/constants';
import { createObservabilityRuleTypeRegistryMock } from '../../../rules/observability_rule_type_registry_mock';
import { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import * as pluginContext from '../../../hooks/use_plugin_context';
import { ConfigSchema, ObservabilityPublicPluginsStart } from '../../../plugin';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

const refresh = jest.fn();
const caseHooksReturnedValue = {
  open: () => {
    refresh();
  },
  close: jest.fn(),
};

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
mockUseKibanaReturnValue.services.cases.hooks.useCasesAddToNewCaseFlyout.mockReturnValue(
  caseHooksReturnedValue
);

mockUseKibanaReturnValue.services.cases.hooks.useCasesAddToExistingCaseModal.mockReturnValue(
  caseHooksReturnedValue
);

jest.mock('../../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('../../../hooks/use_get_user_cases_permissions', () => ({
  useGetUserCasesPermissions: jest.fn(() => ({ create: true, read: true })),
}));

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(() => ({
    services: { notifications: { toasts: { addDanger: jest.fn(), addSuccess: jest.fn() } } },
  })),
}));

const config = {
  unsafe: {
    alertDetails: {
      logs: { enabled: false },
      metrics: { enabled: false },
      uptime: { enabled: false },
    },
  },
} as ConfigSchema;

jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {} as AppMountParameters,
  core: {} as CoreStart,
  config,
  plugins: {} as ObservabilityPublicPluginsStart,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
}));

describe('ObservabilityActions component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = async (pageId: string) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });

    const props: Props = {
      config,
      data: inventoryThresholdAlert as unknown as TimelineNonEcsData[],
      ecsData: {
        _id: '6d4c6d74-d51a-495c-897d-88ced3b95e30',
        _index: '.internal.alerts-observability.metrics.alerts-default-000001',
      },
      id: pageId,
      observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
      setFlyoutAlert: jest.fn(),
      refresh,
    };

    const wrapper = mountWithIntl(
      <QueryClientProvider client={queryClient}>
        <AlertActions {...props} />
      </QueryClientProvider>
    );
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
    expect(wrapper.find('[data-test-subj~="viewAlertDetailsFlyout"]').hostNodes().length).toBe(1);
  });

  it('should show "View rule details" menu item', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().length).toBe(1);
    expect(wrapper.find('[data-test-subj~="viewAlertDetailsFlyout"]').hostNodes().length).toBe(1);
  });

  it('should create a valid link for rule details page', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().length).toBe(1);
    expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().prop('href')).toBe(
      '/app/observability/alerts/rules/06f53080-0f91-11ed-9d86-013908b232ef'
    );
  });

  it('should refresh when adding an alert to a new case', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    expect(wrapper.find('[data-test-subj="add-to-new-case-action"]').hostNodes().length).toBe(1);

    wrapper.find('[data-test-subj="add-to-new-case-action"]').hostNodes().simulate('click');
    expect(refresh).toHaveBeenCalled();
  });

  it('should refresh when when calling onSuccess of useCasesAddToNewCaseFlyout', async () => {
    await setup('nothing');

    // @ts-expect-error: The object will always be defined
    mockUseKibanaReturnValue.services.cases.hooks.useCasesAddToNewCaseFlyout.mock.calls[0][0].onSuccess();

    expect(refresh).toHaveBeenCalled();
  });

  it('should refresh when adding an alert to an existing case', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    expect(wrapper.find('[data-test-subj="add-to-existing-case-action"]').hostNodes().length).toBe(
      1
    );

    wrapper.find('[data-test-subj="add-to-existing-case-action"]').hostNodes().simulate('click');
    expect(refresh).toHaveBeenCalled();
  });

  it('should refresh when when calling onSuccess of useCasesAddToExistingCaseModal', async () => {
    await setup('nothing');

    // @ts-expect-error: The object will always be defined
    mockUseKibanaReturnValue.services.cases.hooks.useCasesAddToExistingCaseModal.mock.calls[0][0].onSuccess();

    expect(refresh).toHaveBeenCalled();
  });
});
