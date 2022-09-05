/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPanel } from '@elastic/eui';

import { ValidationStateIcon } from './validation_state_icon';
import { ValidationStepPanel } from './validation_step_panel';

describe('ValidationStepPanel', () => {
  describe('renders', () => {
    const wrapper = shallow(
      <ValidationStepPanel step={{ state: 'valid' }} label={'Initial validation'} />
    );

    it('passed the correct color to the EuiPanel', () => {
      expect(wrapper.find(EuiPanel).prop('color')).toEqual('success');
    });

    it('contains a validation state icon', () => {
      expect(wrapper.find(ValidationStateIcon)).toHaveLength(1);
    });

    it('renders a label', () => {
      expect(wrapper.find('h3').text()).toEqual('Initial validation');
    });
  });
  describe('invalid messages and actions', () => {
    const errorMessage = 'Error message';
    const action = <div data-test-subj="action" />;

    it('displays the passed error message and action is invalid', () => {
      const wrapper = shallow(
        <ValidationStepPanel
          step={{ state: 'invalid', message: errorMessage }}
          label="initialValidation"
          action={action}
        />
      );
      expect(wrapper.find('[data-test-subj="errorMessage"]').childAt(0).text()).toContain(
        'Error message'
      );
      expect(wrapper.find('[data-test-subj="action"]')).toHaveLength(1);
    });

    it('displays the passed error message and action when state is warning', () => {
      const wrapper = shallow(
        <ValidationStepPanel
          step={{ state: 'warning', message: errorMessage }}
          label="initialValidation"
          action={action}
        />
      );
      expect(wrapper.find('[data-test-subj="errorMessage"]').childAt(0).text()).toContain(
        'Error message'
      );
      expect(wrapper.find('[data-test-subj="action"]')).toHaveLength(1);
    });

    it('does not display the passed error message or action when state is loading', () => {
      const wrapper = shallow(
        <ValidationStepPanel
          step={{ state: 'loading', message: errorMessage }}
          label="initialValidation"
          action={action}
        />
      );
      expect(wrapper.find('[data-test-subj="errorMessage"]')).toHaveLength(0);
      expect(wrapper.find('[data-test-subj="action"]')).toHaveLength(0);
    });
  });
});
