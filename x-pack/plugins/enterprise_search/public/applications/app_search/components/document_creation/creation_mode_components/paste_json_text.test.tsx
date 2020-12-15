/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';
import { rerender } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiTextArea, EuiButtonEmpty, EuiButton } from '@elastic/eui';

import { PasteJsonText, ModalHeader, ModalBody, ModalFooter } from './paste_json_text';

describe('PasteJsonText', () => {
  const values = {
    textInput: 'hello world',
    configuredLimits: {
      engine: {
        maxDocumentByteSize: 102400,
      },
    },
  };
  const actions = {
    setTextInput: jest.fn(),
    closeDocumentCreation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<PasteJsonText />);
    expect(wrapper.find(ModalHeader)).toHaveLength(1);
    expect(wrapper.find(ModalBody)).toHaveLength(1);
    expect(wrapper.find(ModalFooter)).toHaveLength(1);
  });

  describe('ModalHeader', () => {
    it('renders', () => {
      const wrapper = shallow(<ModalHeader />);
      expect(wrapper.find('h2').text()).toEqual('Create documents');
    });
  });

  describe('ModalBody', () => {
    it('renders and updates the textarea value', () => {
      setMockValues({ ...values, textInput: 'lorem ipsum' });
      const wrapper = shallow(<ModalBody />);
      const textarea = wrapper.find(EuiTextArea);

      expect(textarea.prop('value')).toEqual('lorem ipsum');

      textarea.simulate('change', { target: { value: 'dolor sit amet' } });
      expect(actions.setTextInput).toHaveBeenCalledWith('dolor sit amet');
    });
  });

  describe('ModalFooter', () => {
    it('closes the modal', () => {
      const wrapper = shallow(<ModalFooter />);

      wrapper.find(EuiButtonEmpty).simulate('click');
      expect(actions.closeDocumentCreation).toHaveBeenCalled();
    });

    it('disables/enables the Continue button based on whether text has been entered', () => {
      const wrapper = shallow(<ModalFooter />);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(false);

      setMockValues({ ...values, textInput: '' });
      rerender(wrapper);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(true);
    });
  });
});
