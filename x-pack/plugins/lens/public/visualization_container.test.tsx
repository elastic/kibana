/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { VisualizationContainer } from './visualization_container';

describe('VisualizationContainer', () => {
  test('renders child content', () => {
    const component = mount(<VisualizationContainer>Hello!</VisualizationContainer>);

    expect(component.text()).toEqual('Hello!');
  });

  test('renders style', () => {
    const component = mount(
      <VisualizationContainer style={{ color: 'blue' }}>Hello!</VisualizationContainer>
    );
    const el = component.find('.lnsVisualizationContainer').first();

    expect(el.prop('style')).toEqual({ color: 'blue' });
  });

  test('combines class names with container class', () => {
    const component = mount(
      <VisualizationContainer className="myClass">Hello!</VisualizationContainer>
    );
    const el = component.find('.lnsVisualizationContainer').first();

    expect(el.prop('className')).toEqual('myClass lnsVisualizationContainer');
  });
});
