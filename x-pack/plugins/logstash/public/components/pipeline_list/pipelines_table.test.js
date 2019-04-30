/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { PipelinesTable } from './pipelines_table';

describe('PipelinesTable component', () => {
  let props;
  let clonePipeline;
  let createPipeline;
  let onDeleteSelectedPipelines;
  let onSelectionChange;
  let openPipeline;

  beforeEach(() => {
    clonePipeline = jest.fn();
    createPipeline = jest.fn();
    onDeleteSelectedPipelines = jest.fn();
    onSelectionChange = jest.fn();
    openPipeline = jest.fn();

    props = {
      clonePipeline,
      createPipeline,
      isReadOnly: false,
      isSelectable: true,
      message: null,
      onDeleteSelectedPipelines,
      onSelectionChange,
      openPipeline,
      pipelines: [{ id: 'testPipeline' }],
      selection: [],
    };
  });

  it('renders component as expected', () => {
    const wrapper = shallowWithIntl(<PipelinesTable.WrappedComponent {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('calls clone when cloned button clicked', () => {
    props.pipelines = [{ id: 'testPipeline', isCentrallyManaged: true }];
    const wrapper = mountWithIntl(<PipelinesTable.WrappedComponent {...props} />);
    wrapper.find('[iconType="copy"]').simulate('click');
    expect(clonePipeline).toHaveBeenCalled();
  });

  it('calls createPipeline on create button clicked', () => {
    const wrapper = mountWithIntl(<PipelinesTable.WrappedComponent {...props} />);
    wrapper.find('.euiButton--primary').simulate('click');
    expect(createPipeline).toHaveBeenCalled();
  });

  it('calls delete prompt on delete click', () => {
    props.selection = [{ id: 'testPipeline' }];
    const wrapper = mountWithIntl(<PipelinesTable.WrappedComponent {...props} />);
    wrapper.find('.euiButton--danger').simulate('click');
    expect(onDeleteSelectedPipelines).toHaveBeenCalled();
  });

  it('calls openPipeline on id click', () => {
    props.pipelines = [{ id: 'testPipeline', isCentrallyManaged: true }];
    const wrapper = mountWithIntl(<PipelinesTable.WrappedComponent {...props} />);
    wrapper.find('EuiLink').simulate('click');
    expect(openPipeline).toHaveBeenCalledWith('testPipeline');
  });
});
