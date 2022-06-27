/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCheckbox } from '@elastic/eui';

import { AddDomainValidation } from './add_domain_validation';
import { ValidationStepPanel } from './validation_step_panel';

describe('AddDomainValidation', () => {
  const actions = {
    setIgnoreValidationFailure: jest.fn(),
  };

  it('contains four validation steps', () => {
    setMockValues({
      addDomainFormInputValue: 'https://elastic.co',
      domainValidationResult: {
        steps: {
          contentVerification: { state: 'loading' },
          indexingRestrictions: { state: 'loading' },
          initialValidation: { state: 'loading' },
          networkConnectivity: { state: 'loading' },
        },
      },
    });

    const wrapper = shallow(<AddDomainValidation />);

    expect(wrapper.find(ValidationStepPanel)).toHaveLength(4);
  });

  it('can ignore validation failure', () => {
    setMockValues({
      canIgnoreValidationFailure: true,
      ignoreValidationFailure: false,
      addDomainFormInputValue: 'https://elastic.co',
      domainValidationResult: {
        steps: {
          contentVerification: { state: 'invalid', blockingFailure: true },
          indexingRestrictions: { state: 'valid' },
          initialValidation: { state: 'valid' },
          networkConnectivity: { state: 'valid' },
        },
      },
    });
    setMockActions(actions);

    const wrapper = shallow(<AddDomainValidation />);
    wrapper
      .find(EuiCheckbox)
      .first()
      .simulate('change', { target: { checked: true } });

    expect(actions.setIgnoreValidationFailure).toHaveBeenCalledWith(true);
  });
});
