/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPanel } from '@elastic/eui';

import { ValidationStateIcon } from './validation_state_icon';
import { ValidationStepPanel } from './validation_step_panel';

describe('ValidationStepPanel', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    wrapper = shallow(
      <ValidationStepPanel step={{ state: 'valid' }} label={'initialValidation'} />
    );
  });

  it('passed the correct color to the EuiPanel', () => {
    expect(wrapper.find(EuiPanel).prop('color')).toEqual('success');
  });

  it('contains a validation state icon', () => {
    expect(wrapper.find(ValidationStateIcon)).toHaveLength(1);
  });

  it('hides error message by default', () => {
    expect(wrapper.find('[data-test-subj="ErrorMessage"]')).toHaveLength(0);
  });

  it('displays an error message state is invalid', () => {
    wrapper = shallow(
      <ValidationStepPanel
        step={{ state: 'invalid', message: 'error message' }}
        label={'initialValidation'}
      />
    );

    expect(wrapper.find('[data-test-subj="ErrorMessage"]').dive().text()).toContain(
      'error message'
    );
  });

  it('displays an action when state is invalid and there is an error message ', () => {
    wrapper = shallow(
      <ValidationStepPanel
        step={{ state: 'invalid', message: 'error message' }}
        label={'initialValidation'}
        action={<div data-test-subj="Action" />}
      />
    );

    expect(wrapper.find('[data-test-subj="Action"]')).toHaveLength(1);
  });
});
