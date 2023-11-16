/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { Routes, Route } from '@kbn/shared-ux-router';

import { GroupRouter } from './group_router';
import { Groups } from './groups';
import { GroupsRouter } from './groups_router';

describe('GroupsRouter', () => {
  const initializeGroups = jest.fn();

  beforeEach(() => {
    setMockActions({ initializeGroups });
  });

  it('renders', () => {
    const wrapper = shallow(<GroupsRouter />);

    expect(wrapper.find(Routes)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(2);
    expect(wrapper.find(GroupRouter)).toHaveLength(1);
    expect(wrapper.find(Groups)).toHaveLength(1);
  });
});
