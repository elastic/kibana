/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PipelineViewer } from '../pipeline_viewer';
import { shallowWithIntl } from '../../../../../../../../test_utils/enzyme_helpers';
import { get } from 'lodash';

describe('PipelineViewer component', () => {
  let pipeline;
  let component;

  beforeEach(() => {
    pipeline = {
      inputs: [
        {
          depth: 0,
          id: 'standardInput',
          parentId: null,
        },
      ],
      filters: [
        {
          depth: 0,
          id: 'mutate',
          parentId: null,
        },
      ],
      outputs: [
        {
          depth: 0,
          id: 'elasticsearch',
          parentId: null,
        },
      ],
      queue: {
        id: '__QUEUE__',
        hasExplicitId: false,
        stats: [],
        meta: null,
      },
    };

    component = <PipelineViewer.WrappedComponent pipeline={pipeline} />;
  });

  it('passes expected props', () => {
    const renderedComponent = shallowWithIntl(component);

    expect(renderedComponent).toMatchSnapshot();
  });

  it('changes selected vertex', () => {
    const vertex = { id: 'stdin' };

    const instance = shallowWithIntl(component).instance();
    instance.onShowVertexDetails(vertex);

    expect(get(instance, 'state.detailDrawer.vertex')).toBe(vertex);
  });

  it('toggles selected vertex on second pass', () => {
    const vertex = { id: 'stdin' };

    const instance = shallowWithIntl(component).instance();
    instance.onShowVertexDetails(vertex);
    instance.onShowVertexDetails(vertex);

    expect(get(instance, 'state.detailDrawer.vertex')).toBeNull();
  });

  it('renders DetailDrawer when selected vertex is not null', () => {
    const vertex = { id: 'stdin' };

    const wrapper = shallowWithIntl(component);
    const instance = wrapper.instance();
    instance.onShowVertexDetails(vertex);
    wrapper.update();

    expect(wrapper).toMatchSnapshot();
  });
});
