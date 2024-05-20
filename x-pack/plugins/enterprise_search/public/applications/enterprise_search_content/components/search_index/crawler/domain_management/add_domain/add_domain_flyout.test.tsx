/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockActions, setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';

import { AddDomainFlyout } from './add_domain_flyout';
import { AddDomainForm } from './add_domain_form';
import { AddDomainFormErrors } from './add_domain_form_errors';
import { AddDomainFormSubmitButton } from './add_domain_form_submit_button';

const MOCK_ACTIONS = {
  closeFlyout: jest.fn(),
};

describe('AddDomainFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
  });

  it('can be hidden', () => {
    setMockValues({
      isFlyoutVisible: false,
    });

    const wrapper = shallow(<AddDomainFlyout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('flyout', () => {
    let wrapper: ShallowWrapper;

    beforeEach(() => {
      setMockValues({
        isFlyoutVisible: true,
      });

      wrapper = shallow(<AddDomainFlyout />);
    });

    it('displays form errors', () => {
      expect(wrapper.find(EuiFlyoutBody).dive().find(AddDomainFormErrors)).toHaveLength(1);
    });

    it('contains a form to add domains', () => {
      expect(wrapper.find(AddDomainForm)).toHaveLength(1);
    });

    it('contains a submit button', () => {
      expect(wrapper.find(AddDomainFormSubmitButton)).toHaveLength(1);
    });

    it('hides the flyout on close', () => {
      wrapper.find(EuiFlyout).simulate('close');

      expect(MOCK_ACTIONS.closeFlyout).toHaveBeenCalled();
    });
  });
});
