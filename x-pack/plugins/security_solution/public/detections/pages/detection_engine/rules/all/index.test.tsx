/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';

import '../../../../../common/mock/match_media';
import { createKibanaContextProviderMock } from '../../../../../common/mock/kibana_react';
import { TestProviders } from '../../../../../common/mock';
import { wait } from '../../../../../common/lib/helpers';
import { AllRules } from './index';

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

jest.mock('../../../../containers/detection_engine/rules', () => {
  return {
    useRules: jest.fn().mockReturnValue([
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
    ]),
    useRulesStatuses: jest.fn().mockReturnValue({
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
    }),
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

  it('renders rules tab', async () => {
    const KibanaContext = createKibanaContextProviderMock();
    const wrapper = mount(
      <TestProviders>
        <KibanaContext services={{ storage: { get: jest.fn() } }}>
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
        </KibanaContext>
      </TestProviders>
    );

    await act(async () => {
      await wait();

      expect(wrapper.exists('[data-test-subj="monitoring-table"]')).toBeFalsy();
      expect(wrapper.exists('[data-test-subj="rules-table"]')).toBeTruthy();
    });
  });

  it('renders monitoring tab when monitoring tab clicked', async () => {
    const KibanaContext = createKibanaContextProviderMock();

    const wrapper = mount(
      <TestProviders>
        <KibanaContext services={{ storage: { get: jest.fn() } }}>
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
        </KibanaContext>
      </TestProviders>
    );
    const monitoringTab = wrapper.find('[data-test-subj="allRulesTableTab-monitoring"] button');
    monitoringTab.simulate('click');

    await act(async () => {
      wrapper.update();
      await wait();

      expect(wrapper.exists('[data-test-subj="monitoring-table"]')).toBeTruthy();
      expect(wrapper.exists('[data-test-subj="rules-table"]')).toBeFalsy();
    });
  });
});
