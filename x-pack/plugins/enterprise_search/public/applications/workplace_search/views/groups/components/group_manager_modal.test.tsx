/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__';
import { groups } from '../../../__mocks__/groups.mock';
import { contentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { GroupManagerModal } from './group_manager_modal';

import { EuiOverlayMask, EuiModal, EuiEmptyPrompt } from '@elastic/eui';

const hideModal = jest.fn();
const selectAll = jest.fn();
const saveItems = jest.fn();

const props = {
  children: <></>,
  label: 'shared content sources',
  allItems: [],
  numSelected: 1,
  hideModal,
  selectAll,
  saveItems,
};

const mockValues = {
  group: groups[0],
  contentSources,
  managerModalFormErrors: [],
};

describe('GroupManagerModal', () => {
  beforeEach(() => {
    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<GroupManagerModal {...props} />);

    expect(wrapper.find(EuiModal)).toHaveLength(1);
    expect(wrapper.find(EuiOverlayMask)).toHaveLength(1);
  });

  it('renders empty state', () => {
    setMockValues({ ...mockValues, contentSources: [] });
    const wrapper = shallow(<GroupManagerModal {...props} />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  it('selects all items when clicked', () => {
    const wrapper = shallow(<GroupManagerModal {...props} numSelected={1} allItems={[{}]} />);

    const button = wrapper.find('[data-test-subj="SelectAllGroups"]');
    button.simulate('click');

    expect(selectAll).toHaveBeenCalledWith([]);
  });

  it('deselects all items when clicked', () => {
    const wrapper = shallow(<GroupManagerModal {...props} numSelected={0} allItems={[{}]} />);

    const button = wrapper.find('[data-test-subj="SelectAllGroups"]');
    button.simulate('click');

    expect(selectAll).toHaveBeenCalledWith([{}]);
  });

  it('handles cancel when clicked', () => {
    const wrapper = shallow(<GroupManagerModal {...props} />);

    const button = wrapper.find('[data-test-subj="CloseGroupsModal"]');
    button.simulate('click');

    expect(hideModal).toHaveBeenCalledWith(groups[0]);
  });
});
