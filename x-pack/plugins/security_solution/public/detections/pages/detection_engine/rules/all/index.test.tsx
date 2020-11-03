/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import '../../../../../common/mock/match_media';
import '../../../../../common/mock/formatted_relative';
import { AllRules } from './index';
import { useKibana } from '../../../../../common/lib/kibana';
import { useRules, useRulesStatuses } from '../../../../containers/detection_engine/rules';
import {
  TestProviders,
  mockGlobalState,
  apolloClientObservable,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../../../common/mock';
import { createStore, State } from '../../../../../common/store';
import { APP_ID } from '../../../../../../common/constants';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../../../../common/components/link_to');
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../containers/detection_engine/rules');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('AllRules', () => {
  const mockRefetchRulesData = jest.fn();
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  beforeEach(() => {
    jest.useFakeTimers();

    (useRules as jest.Mock).mockReturnValue([
      false,
      {
        page: 1,
        perPage: 20,
        total: 1,
        data: [
          {
            actions: [],
            created_at: '2020-02-14T19:49:28.178Z',
            created_by: 'elastic',
            description: 'jibber jabber',
            enabled: false,
            false_positives: [],
            filters: [],
            from: 'now-660s',
            id: 'rule-id-1',
            immutable: true,
            index: ['endgame-*'],
            interval: '10m',
            language: 'kuery',
            max_signals: 100,
            name: 'Credential Dumping - Detected - Elastic Endpoint',
            output_index: '.siem-signals-default',
            query: 'host.name:*',
            references: [],
            risk_score: 73,
            rule_id: '571afc56-5ed9-465d-a2a9-045f099f6e7e',
            severity: 'high',
            tags: ['Elastic', 'Endpoint'],
            threat: [],
            throttle: null,
            to: 'now',
            type: 'query',
            updated_at: '2020-02-14T19:49:28.320Z',
            updated_by: 'elastic',
            version: 1,
          },
        ],
      },
      mockRefetchRulesData,
    ]);

    (useRulesStatuses as jest.Mock).mockReturnValue({
      loading: false,
      rulesStatuses: [
        {
          current_status: {
            alert_id: 'alertId',
            bulk_create_time_durations: ['2235.01'],
            gap: null,
            last_failure_at: null,
            last_failure_message: null,
            last_look_back_date: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            last_success_message: 'it is a success',
            search_after_time_durations: ['616.97'],
            status: 'succeeded',
            status_date: new Date().toISOString(),
          },
          failures: [],
          id: '12345678987654321',
          activate: true,
          name: 'Test rule',
        },
      ],
    });

    useKibanaMock().services.application.capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      actions: { show: true },
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = shallow(
      <AllRules
        createPrePackagedRules={jest.fn()}
        hasNoPermissions={false}
        loading={false}
        loadingCreatePrePackagedRules={false}
        refetchPrePackagedRulesStatus={jest.fn()}
        rulesCustomInstalled={0}
        rulesInstalled={0}
        rulesNotInstalled={0}
        rulesNotUpdated={0}
        setRefreshRulesData={jest.fn()}
      />
    );

    expect(wrapper.find('[title="All rules"]')).toHaveLength(1);
  });

  describe('rules tab', () => {
    it('it pulls from storage to determine if an auto refresh interval is set', async () => {
      useKibanaMock().services.storage.set(`${APP_ID}.detections.allRules.timeRefresh`, [
        false,
        1800000,
      ]);

      mount(
        <TestProviders store={store}>
          <AllRules
            createPrePackagedRules={jest.fn()}
            hasNoPermissions={false}
            loading={false}
            loadingCreatePrePackagedRules={false}
            refetchPrePackagedRulesStatus={jest.fn()}
            rulesCustomInstalled={1}
            rulesInstalled={0}
            rulesNotInstalled={0}
            rulesNotUpdated={0}
            setRefreshRulesData={jest.fn()}
          />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockRefetchRulesData).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1800000);
        expect(mockRefetchRulesData).toHaveBeenCalledTimes(1);
      });
    });

    it('it pulls from storage and does not set an auto refresh interval if storage indicates refresh is paused', async () => {
      useKibanaMock().services.storage.set(`${APP_ID}.detections.allRules.timeRefresh`, [
        true,
        1800000,
      ]);

      mount(
        <TestProviders store={store}>
          <AllRules
            createPrePackagedRules={jest.fn()}
            hasNoPermissions={false}
            loading={false}
            loadingCreatePrePackagedRules={false}
            refetchPrePackagedRulesStatus={jest.fn()}
            rulesCustomInstalled={1}
            rulesInstalled={0}
            rulesNotInstalled={0}
            rulesNotUpdated={0}
            setRefreshRulesData={jest.fn()}
          />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockRefetchRulesData).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1800000);
        expect(mockRefetchRulesData).not.toHaveBeenCalled();
      });
    });

    it('it updates storage with auto refresh selection on component unmount', async () => {
      useKibanaMock().services.storage.set(`${APP_ID}.detections.allRules.timeRefresh`, [
        false,
        1800000,
      ]);

      const wrapper = mount(
        <TestProviders store={store}>
          <AllRules
            createPrePackagedRules={jest.fn()}
            hasNoPermissions={false}
            loading={false}
            loadingCreatePrePackagedRules={false}
            refetchPrePackagedRulesStatus={jest.fn()}
            rulesCustomInstalled={1}
            rulesInstalled={0}
            rulesNotInstalled={0}
            rulesNotUpdated={0}
            setRefreshRulesData={jest.fn()}
          />
        </TestProviders>
      );

      await waitFor(() => {
        wrapper
          .find('[data-test-subj="superDatePickerToggleQuickMenuButton"] button')
          .first()
          .simulate('click');

        wrapper
          .find('input[data-test-subj="superDatePickerRefreshIntervalInput"]')
          .simulate('change', { target: { value: '2' } });

        wrapper
          .find('[data-test-subj="superDatePickerToggleRefreshButton"]')
          .first()
          .simulate('click');

        wrapper.unmount();
        wrapper.mount();

        expect(
          useKibanaMock().services.storage.get(`${APP_ID}.detections.allRules.timeRefresh`)
        ).toEqual([false, 1800000]);
      });
    });

    it('it stops auto refreshing when user hits "Stop"', async () => {
      useKibanaMock().services.storage.set(`${APP_ID}.detections.allRules.timeRefresh`, [
        false,
        1800000,
      ]);

      const wrapper = mount(
        <TestProviders store={store}>
          <AllRules
            createPrePackagedRules={jest.fn()}
            hasNoPermissions={false}
            loading={false}
            loadingCreatePrePackagedRules={false}
            refetchPrePackagedRulesStatus={jest.fn()}
            rulesCustomInstalled={1}
            rulesInstalled={0}
            rulesNotInstalled={0}
            rulesNotUpdated={0}
            setRefreshRulesData={jest.fn()}
          />
        </TestProviders>
      );

      await waitFor(() => {
        wrapper
          .find('[data-test-subj="superDatePickerToggleQuickMenuButton"] button')
          .first()
          .simulate('click');

        wrapper
          .find('[data-test-subj="superDatePickerToggleRefreshButton"]')
          .first()
          .simulate('click');

        expect(mockRefetchRulesData).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1800000);
        expect(mockRefetchRulesData).not.toHaveBeenCalled();
      });
    });

    it('renders all rules tab by default', async () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <AllRules
            createPrePackagedRules={jest.fn()}
            hasNoPermissions={false}
            loading={false}
            loadingCreatePrePackagedRules={false}
            refetchPrePackagedRulesStatus={jest.fn()}
            rulesCustomInstalled={1}
            rulesInstalled={0}
            rulesNotInstalled={0}
            rulesNotUpdated={0}
            setRefreshRulesData={jest.fn()}
          />
        </TestProviders>
      );

      await waitFor(() => {
        expect(wrapper.exists('[data-test-subj="monitoring-table"]')).toBeFalsy();
        expect(wrapper.exists('[data-test-subj="rules-table"]')).toBeTruthy();
      });
    });
  });

  it('renders monitoring tab when monitoring tab clicked', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <AllRules
          createPrePackagedRules={jest.fn()}
          hasNoPermissions={false}
          loading={false}
          loadingCreatePrePackagedRules={false}
          refetchPrePackagedRulesStatus={jest.fn()}
          rulesCustomInstalled={1}
          rulesInstalled={0}
          rulesNotInstalled={0}
          rulesNotUpdated={0}
          setRefreshRulesData={jest.fn()}
        />
      </TestProviders>
    );

    await waitFor(() => {
      const monitoringTab = wrapper.find('[data-test-subj="allRulesTableTab-monitoring"] button');
      monitoringTab.simulate('click');

      wrapper.update();
      expect(wrapper.exists('[data-test-subj="monitoring-table"]')).toBeTruthy();
      expect(wrapper.exists('[data-test-subj="rules-table"]')).toBeFalsy();
    });
  });
});
