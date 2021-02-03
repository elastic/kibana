/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__';
import { groups } from '../../../__mocks__/groups.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { SharedSourcesModal } from './shared_sources_modal';
import { GroupManagerModal } from './group_manager_modal';
import { SourcesList } from './sources_list';

const group = groups[0];

const addGroupSource = jest.fn();
const selectAllSources = jest.fn();
const hideSharedSourcesModal = jest.fn();
const removeGroupSource = jest.fn();
const saveGroupSources = jest.fn();

describe('SharedSourcesModal', () => {
  it('renders', () => {
    setMockActions({
      addGroupSource,
      selectAllSources,
      hideSharedSourcesModal,
      removeGroupSource,
      saveGroupSources,
    });

    setMockValues({
      group,
      selectedGroupSources: [],
      contentSources: group.contentSources,
    });

    const wrapper = shallow(<SharedSourcesModal />);

    expect(wrapper.find(SourcesList)).toHaveLength(1);
    expect(wrapper.find(GroupManagerModal)).toHaveLength(1);
  });
});
