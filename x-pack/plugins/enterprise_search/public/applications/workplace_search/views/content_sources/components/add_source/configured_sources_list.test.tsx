/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergedConfiguredSources } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonEmptyTo } from '../../../../../shared/react_router_helpers';

import { ConfiguredSourcesList } from './configured_sources_list';

describe('ConfiguredSourcesList', () => {
  const props = {
    sources: mergedConfiguredSources,
    isOrganization: true,
  };

  it('renders', () => {
    const wrapper = shallow(<ConfiguredSourcesList {...props} />);

    expect(wrapper.find('[data-test-subj="UnConnectedTooltip"]')).toHaveLength(20);
    expect(wrapper.find('[data-test-subj="AccountOnlyTooltip"]')).toHaveLength(2);
    expect(wrapper.find('[data-test-subj="ConfiguredSourcesListItem"]')).toHaveLength(23);
  });

  it('does show connect button for a connected external source', () => {
    const wrapper = shallow(
      <ConfiguredSourcesList
        {...{
          sources: [{ ...mergedConfiguredSources[0], connected: true, serviceType: 'external' }],
          isOrganization: true,
        }}
      />
    );
    expect(wrapper.find(EuiButtonEmptyTo)).toHaveLength(1);
  });

  it('does show connect button for an unconnected external source', () => {
    const wrapper = shallow(
      <ConfiguredSourcesList
        {...{
          sources: [{ ...mergedConfiguredSources[0], connected: false, serviceType: 'external' }],
          isOrganization: true,
        }}
      />
    );
    const button = wrapper.find(EuiButtonEmptyTo);
    expect(button).toHaveLength(1);
    expect(button.prop('to')).toEqual('/sources/add/external/connect');
  });

  it('connect button for an unconnected source with multiple connector options routes to choice page', () => {
    const wrapper = shallow(
      <ConfiguredSourcesList
        {...{
          sources: [
            {
              ...mergedConfiguredSources[0],
              connected: false,
              serviceType: 'share_point',
              externalConnectorAvailable: true,
            },
          ],
          isOrganization: true,
        }}
      />
    );
    const button = wrapper.find(EuiButtonEmptyTo);
    expect(button).toHaveLength(1);
    expect(button.prop('to')).toEqual('/sources/add/share_point/');
  });

  it('connect button for a source with multiple connector options routes to connect page for private sources', () => {
    const wrapper = shallow(
      <ConfiguredSourcesList
        {...{
          sources: [
            {
              ...mergedConfiguredSources[0],
              connected: false,
              serviceType: 'share_point',
              externalConnectorAvailable: true,
            },
          ],
          isOrganization: false,
        }}
      />
    );
    const button = wrapper.find(EuiButtonEmptyTo);
    expect(button).toHaveLength(1);
    expect(button.prop('to')).toEqual('/p/sources/add/share_point/connect');
  });

  it('handles empty state', () => {
    const wrapper = shallow(<ConfiguredSourcesList sources={[]} isOrganization />);

    expect(wrapper.find('[data-test-subj="ConfiguredSourceEmptyState"]')).toHaveLength(1);
  });
});
