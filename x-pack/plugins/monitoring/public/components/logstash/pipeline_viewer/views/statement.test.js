/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { shallow } from 'enzyme';
import React from 'react';
import { IfElement } from '../models/list/if_element';
import { PluginStatement } from '../models/pipeline/plugin_statement';
import { CollapsibleStatement } from './collapsible_statement';
import { PluginStatement as PluginStatementComponent } from './plugin_statement';
import { Statement } from './statement';

describe('Statement component', () => {
  let props;
  let pluginStatement;
  let branchElement;
  let collapse;
  let expand;
  let onShowVertexDetails;

  beforeEach(() => {
    collapse = jest.fn();
    expand = jest.fn();
    onShowVertexDetails = jest.fn();
    props = {
      collapse,
      element: {
        depth: 0,
        id: 'mutate2',
        statement: {},
      },
      expand,
      isCollapsed: false,
      onShowVertexDetails,
    };
    pluginStatement = new PluginStatement({
      hasExplicitId: true,
      id: 'mutate2',
      latestEventsPerSecond: 23,
      meta: null,
      name: 'mutate',
      pluginType: 'filter',
      stats: [],
    });
    branchElement = new IfElement(
      {
        id: 'ifStatement',
        name: 'ifStatement',
      },
      0,
      null
    );
  });

  it('renders a PluginStatement component for plugin model', () => {
    props.element.statement = pluginStatement;
    const wrapper = shallow(<Statement {...props} />);

    expect(wrapper).toMatchSnapshot();
    expect(wrapper.find(PluginStatementComponent)).toHaveLength(1);
  });

  it('renders spacers for element with depth > 0', () => {
    props.element.depth = 2;
    expect(shallow(<Statement {...props} />)).toMatchSnapshot();
  });

  it('renders a CollapsibleStatement with if body for branch model', () => {
    props.element = branchElement;
    const wrapper = shallow(<Statement {...props} />);

    expect(wrapper).toMatchSnapshot();
    expect(wrapper.find(CollapsibleStatement)).toHaveLength(1);
  });

  it('renders a CollapsibleStatement with else body for non-IfElement', () => {
    expect(shallow(<Statement {...props} />)).toMatchSnapshot();
  });

  it(`selects the element's vertex when the name is clicked`, () => {
    props.element = branchElement;
    const wrapper = shallow(<Statement {...props} />);

    wrapper.find(EuiButtonEmpty).simulate('click');
    expect(onShowVertexDetails).toHaveBeenCalledTimes(1);
  });
});
