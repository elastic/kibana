/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { mount, shallow } from 'enzyme';
import React from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';
import '../../../../../common/mock/formatted_relative';
import '../../../../../common/mock/match_media';
import { RulesFeatureTourContextProvider } from './feature_tour/rules_feature_tour_context';
import { AllRules } from './index';

jest.mock('../../../../../common/components/link_to');
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../containers/detection_engine/rules');
jest.mock('../../../../pages/detection_engine/rules/all/rules_table/rules_table_context');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('AllRules', () => {
  beforeEach(() => {
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
        hasPermissions
        loading={false}
        loadingCreatePrePackagedRules={false}
        rulesCustomInstalled={0}
        rulesInstalled={0}
        rulesNotInstalled={0}
        rulesNotUpdated={0}
      />
    );

    expect(wrapper.find('RulesTables')).toHaveLength(1);
  });

  describe('tabs', () => {
    it('renders all rules tab by default', async () => {
      const wrapper = mount(
        <TestProviders>
          <AllRules
            createPrePackagedRules={jest.fn()}
            hasPermissions
            loading={false}
            loadingCreatePrePackagedRules={false}
            rulesCustomInstalled={1}
            rulesInstalled={0}
            rulesNotInstalled={0}
            rulesNotUpdated={0}
          />
        </TestProviders>,
        { wrappingComponent: RulesFeatureTourContextProvider }
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
          hasPermissions
          loading={false}
          loadingCreatePrePackagedRules={false}
          rulesCustomInstalled={1}
          rulesInstalled={0}
          rulesNotInstalled={0}
          rulesNotUpdated={0}
        />
      </TestProviders>,
      { wrappingComponent: RulesFeatureTourContextProvider }
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
