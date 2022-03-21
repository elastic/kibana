/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import '../../../../../common/mock/match_media';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
} from '../../../../../common/mock';
import { RuleDetailsPage } from './index';
import { createStore, State } from '../../../../../common/store';
import { useUserData } from '../../../../components/user_info';
import { useRuleWithFallback } from '../../../../containers/detection_engine/rules/use_rule_with_fallback';

import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { useParams } from 'react-router-dom';
import { mockHistory, Router } from '../../../../../common/mock/router';

import { useKibana } from '../../../../../common/lib/kibana';

import { fillEmptySeverityMappings } from '../helpers';

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../helpers', () => {
  const original = jest.requireActual('../helpers');
  return {
    ...original,
    fillEmptySeverityMappings: jest.fn().mockReturnValue([]),
  };
});
jest.mock('../../../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../../../common/components/link_to');
jest.mock('../../../../components/user_info');
jest.mock('../../../../containers/detection_engine/rules', () => {
  const original = jest.requireActual('../../../../containers/detection_engine/rules');
  return {
    ...original,
    useRuleStatus: jest.fn(),
  };
});
jest.mock('../../../../containers/detection_engine/rules/use_rule_with_fallback', () => {
  const original = jest.requireActual(
    '../../../../containers/detection_engine/rules/use_rule_with_fallback'
  );
  return {
    ...original,
    useRuleWithFallback: jest.fn(),
  };
});
jest.mock('../../../../../common/containers/sourcerer');
jest.mock('../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
    useHistory: jest.fn(),
  };
});

jest.mock('../../../../../common/lib/kibana');

const mockRedirectLegacyUrl = jest.fn();
const mockGetLegacyUrlConflict = jest.fn();

const state: State = {
  ...mockGlobalState,
};

const mockRule = {
  id: 'myfakeruleid',
  author: [],
  severity_mapping: [],
  risk_score_mapping: [],
  rule_id: 'rule-1',
  risk_score: 50,
  description: 'some description',
  from: 'now-5m',
  to: 'now',
  name: 'some-name',
  severity: 'low',
  type: 'query',
  query: 'some query',
  index: ['index-1'],
  interval: '5m',
  references: [],
  actions: [],
  enabled: false,
  false_positives: [],
  max_signals: 100,
  tags: [],
  threat: [],
  throttle: null,
  version: 1,
  exceptions_list: [],
};
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

describe('RuleDetailsPageComponent', () => {
  beforeAll(() => {
    (useUserData as jest.Mock).mockReturnValue([{}]);
    (useParams as jest.Mock).mockReturnValue({});
    (useSourcererDataView as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      error: null,
      loading: false,
      isExistingRule: true,
      refresh: jest.fn(),
      rule: { ...mockRule },
    });
    (fillEmptySeverityMappings as jest.Mock).mockReturnValue([]);
  });

  async function setup() {
    mockRedirectLegacyUrl.mockReset();
    mockGetLegacyUrlConflict.mockReset();
    const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.spaces = {
      ui: {
        // @ts-expect-error
        components: { getLegacyUrlConflict: mockGetLegacyUrlConflict },
        redirectLegacyUrl: mockRedirectLegacyUrl,
      },
    };
  }

  it('renders correctly with no outcome property on rule', async () => {
    await setup();

    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={mockHistory}>
          <RuleDetailsPage />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="header-page-title"]').exists()).toBe(true);
      expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
      expect(mockGetLegacyUrlConflict).not.toHaveBeenCalled();
    });
  });

  it('renders correctly with outcome === "exactMatch"', async () => {
    await setup();
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      error: null,
      loading: false,
      isExistingRule: true,
      refresh: jest.fn(),
      rule: { ...mockRule, outcome: 'exactMatch' },
    });

    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={mockHistory}>
          <RuleDetailsPage />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="header-page-title"]').exists()).toBe(true);
      expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
      expect(mockGetLegacyUrlConflict).not.toHaveBeenCalled();
    });
  });

  it('renders correctly with outcome === "aliasMatch"', async () => {
    await setup();
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      error: null,
      loading: false,
      isExistingRule: true,
      refresh: jest.fn(),
      rule: { ...mockRule, outcome: 'aliasMatch', alias_purpose: 'savedObjectConversion' },
    });
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={mockHistory}>
          <RuleDetailsPage />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="header-page-title"]').exists()).toBe(true);
      expect(mockRedirectLegacyUrl).toHaveBeenCalledWith({
        path: 'rules/id/myfakeruleid',
        aliasPurpose: 'savedObjectConversion',
        objectNoun: 'rule',
      });
      expect(mockGetLegacyUrlConflict).not.toHaveBeenCalled();
    });
  });

  it('renders correctly when outcome = conflict', async () => {
    await setup();
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      error: null,
      loading: false,
      isExistingRule: true,
      refresh: jest.fn(),
      rule: {
        ...mockRule,
        outcome: 'conflict',
        alias_target_id: 'aliased_rule_id',
        alias_purpose: 'savedObjectConversion',
      },
    });
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={mockHistory}>
          <RuleDetailsPage />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="header-page-title"]').exists()).toBe(true);
      expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
      expect(mockGetLegacyUrlConflict).toHaveBeenCalledWith({
        currentObjectId: 'myfakeruleid',
        objectNoun: 'rule',
        otherObjectId: 'aliased_rule_id',
        otherObjectPath: `rules/id/aliased_rule_id`,
      });
    });
  });
});
