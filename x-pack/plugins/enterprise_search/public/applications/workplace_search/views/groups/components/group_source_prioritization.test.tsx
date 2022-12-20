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

import { EuiTable, EuiEmptyPrompt, EuiRange } from '@elastic/eui';

import { GroupSourcePrioritization } from './group_source_prioritization';

const updatePriority = jest.fn();
const saveGroupSourcePrioritization = jest.fn();
const showOrgSourcesModal = jest.fn();

const mockValues = {
  group: groups[0],
  activeSourcePriorities: [
    {
      [groups[0].id]: 1,
    },
  ],
  dataLoading: false,
  groupPrioritiesUnchanged: true,
};

describe('GroupSourcePrioritization', () => {
  beforeEach(() => {
    setMockActions({
      updatePriority,
      saveGroupSourcePrioritization,
      showOrgSourcesModal,
    });

    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<GroupSourcePrioritization />);

    expect(wrapper.find(EuiTable)).toHaveLength(1);
  });

  it('handles loading state fallbacks', () => {
    setMockValues({ ...mockValues, group: {}, dataLoading: true });
    const wrapper = shallow(<GroupSourcePrioritization />);

    expect(wrapper.prop('isLoading')).toEqual(true);
    expect(wrapper.prop('pageChrome')).toEqual(['Groups', '...', 'Source Prioritization']);
  });

  it('renders empty state', () => {
    setMockValues({
      ...mockValues,
      group: {
        ...groups[0],
        contentSources: [],
      },
    });
    const wrapper = shallow(<GroupSourcePrioritization />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  it('handles slider change', () => {
    const wrapper = shallow(<GroupSourcePrioritization />);

    const slider = wrapper.find(EuiRange).first();
    slider.simulate('change', { currentTarget: { value: 2 } });

    expect(updatePriority).toHaveBeenCalledWith('123', 2);
  });
});
