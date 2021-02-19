/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import '../../../../../common/mock/match_media';
import '../../../../../common/mock/formatted_relative';
import { AllRules } from './index';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { useRulesTable, useRulesStatuses } from '../../../../containers/detection_engine/rules';
import { TestProviders } from '../../../../../common/mock';
import { createUseUiSetting$Mock } from '../../../../../common/lib/kibana/kibana_react.mock';
import {
  DEFAULT_RULE_REFRESH_INTERVAL_ON,
  DEFAULT_RULE_REFRESH_INTERVAL_VALUE,
  DEFAULT_RULE_REFRESH_IDLE_VALUE,
  DEFAULT_RULES_TABLE_REFRESH_SETTING,
} from '../../../../../../common/constants';

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
const mockUseUiSetting$ = useUiSetting$ as jest.Mock;
const mockUseRulesTable = useRulesTable as jest.Mock;

describe('AllRules', () => {
  const mockRefetchRulesData = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();

    mockUseUiSetting$.mockImplementation((key, defaultValue) => {
      const useUiSetting$Mock = createUseUiSetting$Mock();

      return key === DEFAULT_RULES_TABLE_REFRESH_SETTING
        ? [
            {
              on: DEFAULT_RULE_REFRESH_INTERVAL_ON,
              value: DEFAULT_RULE_REFRESH_INTERVAL_VALUE,
              idleTimeout: DEFAULT_RULE_REFRESH_IDLE_VALUE,
            },
            jest.fn(),
          ]
        : useUiSetting$Mock(key, defaultValue);
    });

    mockUseRulesTable.mockImplementation(({ initialStateOverride }) => {
      const initialState = {
        rules: [
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
        pagination: {
          page: 1,
          perPage: 20,
          total: 1,
        },
        filterOptions: {
          filter: '',
          sortField: 'enabled',
          sortOrder: 'desc',
          tags: [],
          showCustomRules: false,
          showElasticRules: false,
        },
        loadingRulesAction: null,
        loadingRuleIds: [],
        selectedRuleIds: [],
        exportRuleIds: [],
        lastUpdated: 0,
        isRefreshOn: true,
        showIdleModal: false,
      };

      return {
        state: { ...initialState, ...initialStateOverride },
        dispatch: jest.fn(),
        reFetchRules: mockRefetchRulesData,
        setRules: jest.fn(),
        updateRules: jest.fn(),
        updateOptions: jest.fn(),
        actionStarted: jest.fn(),
        actionStopped: jest.fn(),
        setShowIdleModal: jest.fn(),
        setLastRefreshDate: jest.fn(),
        setAutoRefreshOn: jest.fn(),
      };
    });

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

    expect(wrapper.find('[data-test-subj="allRulesTableTab-rules"]')).toHaveLength(1);
  });

  it('it pulls from uiSettings to determine default refresh values', async () => {
    mount(
      <TestProviders>
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

      jest.advanceTimersByTime(DEFAULT_RULE_REFRESH_INTERVAL_VALUE);
      expect(mockRefetchRulesData).toHaveBeenCalledTimes(1);
    });
  });

  // refresh functionality largely tested in cypress tests
  it('it pulls from storage and does not set an auto refresh interval if storage indicates refresh is paused', async () => {
    mockUseUiSetting$.mockImplementation(() => [
      {
        on: false,
        value: DEFAULT_RULE_REFRESH_INTERVAL_VALUE,
        idleTimeout: DEFAULT_RULE_REFRESH_IDLE_VALUE,
      },
      jest.fn(),
    ]);

    const wrapper = mount(
      <TestProviders>
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

      jest.advanceTimersByTime(DEFAULT_RULE_REFRESH_INTERVAL_VALUE);
      expect(mockRefetchRulesData).not.toHaveBeenCalled();

      wrapper.find('[data-test-subj="refreshSettings"] button').first().simulate('click');

      wrapper.find('[data-test-subj="refreshSettingsSwitch"]').first().simulate('click');

      jest.advanceTimersByTime(DEFAULT_RULE_REFRESH_INTERVAL_VALUE);
      expect(mockRefetchRulesData).not.toHaveBeenCalled();
    });
  });

  describe('tabs', () => {
    it('renders all rules tab by default', async () => {
      const wrapper = mount(
        <TestProviders>
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
      <TestProviders>
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

  it('renders exceptions lists tab when tab clicked', async () => {
    const wrapper = mount(
      <TestProviders>
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
      const exceptionsTab = wrapper.find('[data-test-subj="allRulesTableTab-exceptions"] button');
      exceptionsTab.simulate('click');

      wrapper.update();
      expect(wrapper.exists('[data-test-subj="allExceptionListsPanel"]')).toBeTruthy();
      expect(wrapper.exists('[data-test-subj="rules-table"]')).toBeFalsy();
      expect(wrapper.exists('[data-test-subj="monitoring-table"]')).toBeFalsy();
    });
  });
});
