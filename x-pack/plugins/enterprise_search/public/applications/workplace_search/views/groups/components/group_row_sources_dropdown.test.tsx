/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { contentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { GroupRowSourcesDropdown } from './group_row_sources_dropdown';
import { SourceOptionItem } from './source_option_item';

import { EuiFilterGroup } from '@elastic/eui';

const onButtonClick = jest.fn();
const closePopover = jest.fn();

const props = {
  isPopoverOpen: true,
  numOptions: 1,
  groupSources: contentSources,
  onButtonClick,
  closePopover,
};

describe('GroupRowSourcesDropdown', () => {
  it('renders', () => {
    const wrapper = shallow(<GroupRowSourcesDropdown {...props} />);

    expect(wrapper.find(SourceOptionItem)).toHaveLength(2);
    expect(wrapper.find(EuiFilterGroup)).toHaveLength(1);
  });
});
