/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/kea.mock';

import { contentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { GroupSources } from './group_sources';
import { GroupRowSourcesDropdown } from './group_row_sources_dropdown';

import { SourceIcon } from '../../../components/shared/source_icon';

import { ContentSourceDetails } from '../../../types';

describe('GroupSources', () => {
  it('renders', () => {
    const wrapper = shallow(<GroupSources groupSources={contentSources} />);

    expect(wrapper.find(SourceIcon)).toHaveLength(2);
  });

  it('handles hidden sources when count is higer than 10', () => {
    const sources = [] as ContentSourceDetails[];
    const NUM_TOTAL_SOURCES = 10;

    [...Array(NUM_TOTAL_SOURCES)].forEach((_, i) => {
      sources.push({
        ...contentSources[0],
        id: i.toString(),
      });
    });

    const wrapper = shallow(<GroupSources groupSources={sources} />);

    // These were needed for 100% test coverage.
    wrapper.find(GroupRowSourcesDropdown).invoke('onButtonClick')();
    wrapper.find(GroupRowSourcesDropdown).invoke('closePopover')();

    expect(wrapper.find(GroupRowSourcesDropdown)).toHaveLength(1);
  });
});
