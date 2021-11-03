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

jest.mock('../../../../common/lib/kibana');

describe('UpdatePrePackagedRulesCallOut', () => {
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
    const wrapper = shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={0}
        numberOfUpdatedTimelines={0}
        updateRules={jest.fn()}
      />
    );

    expect(wrapper.find('EuiCallOut')).toHaveLength(1);
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines = 0', () => {
    const wrapper = shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={1}
        numberOfUpdatedTimelines={0}
        updateRules={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="update-callout"]').find('p').text()).toEqual(
      'You can update 1 Elastic prebuilt ruleRelease notes'
    );
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines = 0', () => {
    const wrapper = shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={1}
        numberOfUpdatedTimelines={0}
        updateRules={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="update-callout-button"]').prop('children')).toEqual(
      'Update 1 Elastic prebuilt rule'
    );
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules = 0 and numberOfUpdatedTimelines > 0', () => {
    const wrapper = shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={0}
        numberOfUpdatedTimelines={1}
        updateRules={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="update-callout"]').find('p').text()).toEqual(
      'You can update 1 Elastic prebuilt timelineRelease notes'
    );
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules = 0 and numberOfUpdatedTimelines > 0', () => {
    const wrapper = shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={0}
        numberOfUpdatedTimelines={1}
        updateRules={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="update-callout-button"]').prop('children')).toEqual(
      'Update 1 Elastic prebuilt timeline'
    );
  });

  it('renders callOutMessage correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines > 0', () => {
    const wrapper = shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={1}
        numberOfUpdatedTimelines={1}
        updateRules={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="update-callout"]').find('p').text()).toEqual(
      'You can update 1 Elastic prebuilt rule and 1 Elastic prebuilt timeline. Note that this will reload deleted Elastic prebuilt rules.Release notes'
    );
  });

  it('renders buttonTitle correctly: numberOfUpdatedRules > 0 and numberOfUpdatedTimelines > 0', () => {
    const wrapper = shallow(
      <UpdatePrePackagedRulesCallOut
        loading={false}
        numberOfUpdatedRules={1}
        numberOfUpdatedTimelines={1}
        updateRules={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="update-callout-button"]').prop('children')).toEqual(
      'Update 1 Elastic prebuilt rule and 1 Elastic prebuilt timeline'
    );
  });
});
