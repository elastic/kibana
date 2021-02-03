/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions } from '../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { Route, Switch } from 'react-router-dom';

import { GroupsRouter } from './groups_router';

import { GroupRouter } from './group_router';
import { Groups } from './groups';

describe('GroupsRouter', () => {
  const initializeGroups = jest.fn();

  beforeEach(() => {
    setMockActions({ initializeGroups });
  });

  it('renders', () => {
    const wrapper = shallow(<GroupsRouter />);

    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(2);
    expect(wrapper.find(GroupRouter)).toHaveLength(1);
    expect(wrapper.find(Groups)).toHaveLength(1);
  });
});
