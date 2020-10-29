/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { waitFor, act } from '@testing-library/react';

import '../../../../../common/mock/match_media';
import '../../../../../common/mock/formatted_relative';
import { TestProviders } from '../../../../../common/mock';
import { AllRules } from './index';
import { useKibana } from '../../../../../common/lib/kibana';
import { useRules, useRulesStatuses } from '../../../../containers/detection_engine/rules';

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

jest.mock('./reducer', () => {
  return {
    allRulesReducer: jest.fn().mockReturnValue(() => ({
      exportRuleIds: [],
      filterOptions: {
        filter: 'some filter',
        sortField: 'some sort field',
        sortOrder: 'desc',
      },
      loadingRuleIds: [],
      loadingRulesAction: null,
      pagination: {
        page: 1,
        perPage: 20,
        total: 1,
      },
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
      selectedRuleIds: [],
    })),
  };
});

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useHistory: jest.fn(),
  };
});

describe('AllRules', () => {
  const mockRefetchRulesData = jest.fn();

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
    it('it refreshes rule data every minute', async () => {
      await act(async () => {
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
          jest.advanceTimersByTime(60000);

          expect(mockRefetchRulesData).toHaveBeenCalledTimes(1);
          jest.advanceTimersByTime(30000);
          expect(mockRefetchRulesData).toHaveBeenCalledTimes(1);
          jest.advanceTimersByTime(30000);
          expect(mockRefetchRulesData).toHaveBeenCalledTimes(2);
        });
      });
    });

    it('renders correctly', async () => {
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
});
