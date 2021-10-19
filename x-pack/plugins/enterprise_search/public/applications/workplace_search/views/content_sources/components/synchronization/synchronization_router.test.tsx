/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { shallow } from 'enzyme';

import { Frequency } from './frequency';
import { ObjectsAndAssets } from './objects_and_assets';
import { Synchronization } from './synchronization';
import { SynchronizationRouter } from './synchronization_router';

describe('SynchronizationRouter', () => {
  it('renders', () => {
    setMockValues({ isOrganization: true });
    const wrapper = shallow(<SynchronizationRouter />);

    expect(wrapper.find(Synchronization)).toHaveLength(1);
    expect(wrapper.find(ObjectsAndAssets)).toHaveLength(1);
    expect(wrapper.find(Frequency)).toHaveLength(2);
    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(4);
  });
});
