/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/kea.mock';

import { setMockActions, setMockValues } from '../../../../__mocks__';
import { groups } from '../../../__mocks__/groups.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { Loading } from '../../../../shared/loading';

import { GroupSourcePrioritization } from './group_source_prioritization';

import { EuiTable, EuiEmptyPrompt, EuiRange } from '@elastic/eui';

const updatePriority = jest.fn();
const saveGroupSourcePrioritization = jest.fn();
const showSharedSourcesModal = jest.fn();

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
      showSharedSourcesModal,
    });

    setMockValues(mockValues);
  });
  it('renders', () => {
    const wrapper = shallow(<GroupSourcePrioritization />);

    expect(wrapper.find(EuiTable)).toHaveLength(1);
  });

  it('returns loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<GroupSourcePrioritization />);

    expect(wrapper.find(Loading)).toHaveLength(1);
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
    slider.simulate('change', { target: { value: 2 } });

    expect(updatePriority).toHaveBeenCalledWith('123', 2);
  });
});
