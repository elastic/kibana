/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import { groups } from '../../../__mocks__/groups.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldText, EuiEmptyPrompt } from '@elastic/eui';

import { Loading } from '../../../../shared/loading';
import { ContentSection } from '../../../components/shared/content_section';
import { SourcesTable } from '../../../components/shared/sources_table';
import { ViewContentHeader } from '../../../components/shared/view_content_header';

import { GroupOverview } from './group_overview';

const deleteGroup = jest.fn();
const showSharedSourcesModal = jest.fn();
const showManageUsersModal = jest.fn();
const showConfirmDeleteModal = jest.fn();
const hideConfirmDeleteModal = jest.fn();
const updateGroupName = jest.fn();
const onGroupNameInputChange = jest.fn();

const mockValues = {
  group: groups[0],
  groupNameInputValue: '',
  dataLoading: false,
  confirmDeleteModalVisible: true,
};

describe('GroupOverview', () => {
  beforeEach(() => {
    setMockActions({
      deleteGroup,
      showSharedSourcesModal,
      showManageUsersModal,
      showConfirmDeleteModal,
      hideConfirmDeleteModal,
      updateGroupName,
      onGroupNameInputChange,
    });
    setMockValues(mockValues);
  });
  it('renders', () => {
    const wrapper = shallow(<GroupOverview />);

    expect(wrapper.find(ContentSection)).toHaveLength(4);
    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
    expect(wrapper.find(SourcesTable)).toHaveLength(1);
  });

  it('returns loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<GroupOverview />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('updates the input value', () => {
    const wrapper = shallow(<GroupOverview />);

    const input = wrapper.find(EuiFieldText);
    input.simulate('change', { target: { value: 'bar' } });

    expect(onGroupNameInputChange).toHaveBeenCalledWith('bar');
  });

  it('submits the form', () => {
    const wrapper = shallow(<GroupOverview />);

    const simulatedEvent = {
      form: 0,
      target: { getAttribute: () => '_self' },
      preventDefault: jest.fn(),
    };

    const form = wrapper.find('form');
    form.simulate('submit', simulatedEvent);
    expect(simulatedEvent.preventDefault).toHaveBeenCalled();
    expect(updateGroupName).toHaveBeenCalled();
  });

  it('renders empty state', () => {
    setMockValues({
      ...mockValues,
      group: {
        ...groups[0],
        users: [],
        contentSources: [],
      },
    });

    const wrapper = shallow(<GroupOverview />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });
});
