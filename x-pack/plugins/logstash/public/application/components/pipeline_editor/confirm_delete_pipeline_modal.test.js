/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ConfirmDeletePipelineModal } from './confirm_delete_pipeline_modal';

describe('ConfirmDeletePipelineModal component', () => {
  let props;

  beforeEach(() => {
    props = {
      id: 'the id',
      cancelDeleteModal: jest.fn(),
      confirmDeletePipeline: jest.fn(),
    };
  });

  it('renders as expected', () => {
    const wrapper = shallow(<ConfirmDeletePipelineModal {...props} />);
    expect(wrapper).toMatchSnapshot();
  });
});
