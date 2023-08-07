/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { groups } from '../../__mocks__/groups.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { Routes, Route } from '@kbn/shared-ux-router';

import { GroupOverview } from './components/group_overview';
import { GroupSourcePrioritization } from './components/group_source_prioritization';
import { OrgSourcesModal } from './components/org_sources_modal';
import { GroupRouter } from './group_router';

describe('GroupRouter', () => {
  const initializeGroup = jest.fn();
  const resetGroup = jest.fn();

  beforeEach(() => {
    setMockValues({
      orgSourcesModalVisible: false,
      group: groups[0],
    });

    setMockActions({
      initializeGroup,
      resetGroup,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<GroupRouter />);

    expect(wrapper.find(Routes)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(2);
    expect(wrapper.find(GroupOverview)).toHaveLength(1);
    expect(wrapper.find(GroupSourcePrioritization)).toHaveLength(1);
  });

  it('renders modal', () => {
    setMockValues({
      orgSourcesModalVisible: true,
      group: groups[0],
    });

    const wrapper = shallow(<GroupRouter />);

    expect(wrapper.find(OrgSourcesModal)).toHaveLength(1);
  });
});
