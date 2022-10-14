/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { UpdatePrePackagedRulesCallOut } from './update_callout';
import { useKibana } from '../../../../common/lib/kibana';
import { useFetchPrebuiltRulesStatusQuery } from '../../../../detection_engine/rule_management/api/hooks/use_fetch_prebuilt_rules_status_query';
import { mockReactQueryResponse } from '../../../../detection_engine/rule_management/api/hooks/__mocks__/mock_react_query_response';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../detection_engine/rule_management/api/hooks/use_prebuilt_rules_status_query');

// TODO: https://github.com/elastic/kibana/pull/142950 Fix and unskip
describe.skip('UpdatePrePackagedRulesCallOut', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        docLinks: {
          ELASTIC_WEBSITE_URL: '',
          DOC_LINK_VERSION: '',
          links: {
            siem: { ruleChangeLog: '' },
          },
        },
      },
    });
  });

  it('renders correctly', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rulesCustomInstalled: 0,
          rulesInstalled: 0,
          rulesNotInstalled: 0,
          rulesNotUpdated: 0,
          timelinesInstalled: 0,
          timelinesNotInstalled: 0,
          timelinesNotUpdated: 0,
        },
      })
    );
    const wrapper = shallow(<UpdatePrePackagedRulesCallOut />);

    expect(wrapper.find('EuiCallOut')).toHaveLength(1);
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines = 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rulesCustomInstalled: 0,
          rulesInstalled: 0,
          rulesNotInstalled: 0,
          rulesNotUpdated: 1,
          timelinesInstalled: 0,
          timelinesNotInstalled: 0,
          timelinesNotUpdated: 0,
        },
      })
    );

    const wrapper = shallow(<UpdatePrePackagedRulesCallOut />);

    expect(wrapper.find('[data-test-subj="update-callout"]').find('p').text()).toEqual(
      'You can update 1 Elastic prebuilt ruleRelease notes'
    );
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines = 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rulesCustomInstalled: 0,
          rulesInstalled: 0,
          rulesNotInstalled: 0,
          rulesNotUpdated: 1,
          timelinesInstalled: 0,
          timelinesNotInstalled: 0,
          timelinesNotUpdated: 0,
        },
      })
    );

    const wrapper = shallow(<UpdatePrePackagedRulesCallOut />);

    expect(wrapper.find('[data-test-subj="update-callout-button"]').prop('children')).toEqual(
      'Update 1 Elastic prebuilt rule'
    );
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules = 0 and numberOfUpdatedTimelines > 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rulesCustomInstalled: 0,
          rulesInstalled: 0,
          rulesNotInstalled: 0,
          rulesNotUpdated: 0,
          timelinesInstalled: 0,
          timelinesNotInstalled: 0,
          timelinesNotUpdated: 1,
        },
      })
    );

    const wrapper = shallow(<UpdatePrePackagedRulesCallOut />);

    expect(wrapper.find('[data-test-subj="update-callout"]').find('p').text()).toEqual(
      'You can update 1 Elastic prebuilt timelineRelease notes'
    );
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules = 0 and numberOfUpdatedTimelines > 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rulesCustomInstalled: 0,
          rulesInstalled: 0,
          rulesNotInstalled: 0,
          rulesNotUpdated: 0,
          timelinesInstalled: 0,
          timelinesNotInstalled: 0,
          timelinesNotUpdated: 1,
        },
      })
    );

    const wrapper = shallow(<UpdatePrePackagedRulesCallOut />);

    expect(wrapper.find('[data-test-subj="update-callout-button"]').prop('children')).toEqual(
      'Update 1 Elastic prebuilt timeline'
    );
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines > 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rulesCustomInstalled: 0,
          rulesInstalled: 0,
          rulesNotInstalled: 0,
          rulesNotUpdated: 1,
          timelinesInstalled: 0,
          timelinesNotInstalled: 0,
          timelinesNotUpdated: 1,
        },
      })
    );

    const wrapper = shallow(<UpdatePrePackagedRulesCallOut />);

    expect(wrapper.find('[data-test-subj="update-callout"]').find('p').text()).toEqual(
      'You can update 1 Elastic prebuilt rule and 1 Elastic prebuilt timeline. Note that this will reload deleted Elastic prebuilt rules.Release notes'
    );
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines > 0', () => {
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValue(
      mockReactQueryResponse({
        data: {
          rulesCustomInstalled: 0,
          rulesInstalled: 0,
          rulesNotInstalled: 0,
          rulesNotUpdated: 1,
          timelinesInstalled: 0,
          timelinesNotInstalled: 0,
          timelinesNotUpdated: 1,
        },
      })
    );

    const wrapper = shallow(<UpdatePrePackagedRulesCallOut />);

    expect(wrapper.find('[data-test-subj="update-callout-button"]').prop('children')).toEqual(
      'Update 1 Elastic prebuilt rule and 1 Elastic prebuilt timeline'
    );
  });
});
