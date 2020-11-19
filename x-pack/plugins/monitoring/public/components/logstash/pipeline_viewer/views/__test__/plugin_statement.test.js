/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PluginStatement } from '../plugin_statement';
import { shallow } from 'enzyme';

import { EuiButtonEmpty, EuiBadge } from '@elastic/eui';

describe('PluginStatement component', () => {
  let props;
  let onShowVertexDetails;
  let isSlow;
  let isTimeConsuming;
  let processorStatement;

  beforeEach(() => {
    onShowVertexDetails = jest.fn();
    props = {
      statement: {
        hasExplicitId: true,
        id: 'standardInput',
        name: 'stdin',
        pluginType: 'input',
        vertex: {
          latestEventsPerSecond: 125,
        },
      },
      onShowVertexDetails,
    };

    isSlow = jest.fn().mockImplementation(() => false);
    isTimeConsuming = jest.fn().mockImplementation(() => false);
    processorStatement = {
      hasExplicitId: true,
      id: 'mutatePlugin',
      name: 'mutate',
      pluginType: 'filter',
      vertex: {
        latestMillisPerEvent: 100,
        latestEventsPerSecond: 120,
        percentOfTotalProcessorTime: 25,
        isSlow,
        isTimeConsuming,
      },
    };
  });

  const render = (props) => shallow(<PluginStatement {...props} />);

  it('renders input metrics and explicit id fields', () => {
    expect(render(props)).toMatchSnapshot();
  });

  it('does not render explicit id field if no id is specified', () => {
    props.statement.id = 'dcbb2c37b4fedd3d7b852b5052f03dw3fbe1545a';
    props.statement.hasExplicitId = false;
    expect(render(props)).toMatchSnapshot();
  });

  it('renders processor statement metrics', () => {
    props.statement = processorStatement;
    expect(render(props)).toMatchSnapshot();
    expect(isSlow).toHaveBeenCalledTimes(1);
    expect(isTimeConsuming).toHaveBeenCalledTimes(1);
  });

  it('adds warning highlight for cpu time', () => {
    props.statement = processorStatement;
    props.statement.vertex.isTimeConsuming = jest.fn().mockImplementation(() => true);
    expect(render(props)).toMatchSnapshot();
  });

  it('adds warning highlight for event millis', () => {
    props.statement = processorStatement;
    props.statement.vertex.isSlow = jest.fn().mockImplementation(() => true);
    expect(render(props)).toMatchSnapshot();
  });

  it('handles name button click', () => {
    const { vertex } = props.statement;
    const wrapper = render(props);
    wrapper.find(EuiButtonEmpty).simulate('click');

    expect(onShowVertexDetails).toHaveBeenCalledTimes(1);
    expect(onShowVertexDetails).toHaveBeenCalledWith(vertex);
  });

  it('handles id badge click', () => {
    const { vertex } = props.statement;
    const wrapper = render(props);
    wrapper.find(EuiBadge).simulate('click');

    expect(onShowVertexDetails).toHaveBeenCalledTimes(1);
    expect(onShowVertexDetails).toHaveBeenCalledWith(vertex);
  });
});
