/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { AddJoinButton } from './add_join_button';

test('Should render add join button', () => {
  const component = shallow(
    <AddJoinButton addJoin={() => {}} isLayerSourceMvt={false} numJoins={0} />
  );
  expect(component).toMatchSnapshot();
});

test('Should enable add button when layer source is MVT and there is no join', () => {
  const component = shallow(
    <AddJoinButton addJoin={() => {}} isLayerSourceMvt={true} numJoins={0} />
  );
  expect(component).toMatchSnapshot();
});

test('Should disable add button when layer source is MVT and there is one join', () => {
  const component = shallow(
    <AddJoinButton addJoin={() => {}} isLayerSourceMvt={true} numJoins={1} />
  );
  expect(component).toMatchSnapshot();
});
