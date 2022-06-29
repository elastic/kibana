/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergedConfiguredSources } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonEmpty } from '@elastic/eui';

import { EuiButtonEmptyTo } from '../../../../../shared/react_router_helpers';

import { ConfiguredSourcesList } from './configured_sources_list';

describe('ConfiguredSourcesList', () => {
  const props = {
    sources: mergedConfiguredSources,
    isOrganization: true,
  };

  it('renders', () => {
    const wrapper = shallow(<ConfiguredSourcesList {...props} />);

    expect(wrapper.find('[data-test-subj="UnConnectedTooltip"]')).toHaveLength(19);
    expect(wrapper.find('[data-test-subj="AccountOnlyTooltip"]')).toHaveLength(2);
    expect(wrapper.find('[data-test-subj="ConfiguredSourcesListItem"]')).toHaveLength(22);
  });

  it('shows connect button for an source with multiple connector options that routes to choice page', () => {
    const wrapper = shallow(
      <ConfiguredSourcesList
        {...{
          sources: [
            {
              ...mergedConfiguredSources[0],
              serviceType: 'share_point',
            },
          ],
          isOrganization: true,
        }}
      />
    );
    const button = wrapper.find(EuiButtonEmptyTo);
    expect(button).toHaveLength(1);
    expect(button.prop('to')).toEqual('/sources/add/share_point/choice');
  });

  it('shows connect button for a source without multiple connector options that routes to add page', () => {
    const wrapper = shallow(
      <ConfiguredSourcesList
        {...{
          sources: [
            {
              ...mergedConfiguredSources[0],
              serviceType: 'slack',
            },
          ],
          isOrganization: true,
        }}
      />
    );
    const button = wrapper.find(EuiButtonEmptyTo);
    expect(button).toHaveLength(1);
    expect(button.prop('to')).toEqual('/sources/add/slack/');
  });

  it('disabled when in organization mode and connector is account context only', () => {
    const wrapper = shallow(
      <ConfiguredSourcesList
        {...{
          sources: [
            {
              ...mergedConfiguredSources[0],
              serviceType: 'gmail',
              accountContextOnly: true,
            },
          ],
          isOrganization: true,
        }}
      />
    );
    const button = wrapper.find(EuiButtonEmpty);
    expect(button).toHaveLength(1);
    expect(button.prop('isDisabled')).toBe(true);
  });

  it('handles empty state', () => {
    const wrapper = shallow(<ConfiguredSourcesList sources={[]} isOrganization />);

    expect(wrapper.find('[data-test-subj="ConfiguredSourceEmptyState"]')).toHaveLength(1);
  });
});
