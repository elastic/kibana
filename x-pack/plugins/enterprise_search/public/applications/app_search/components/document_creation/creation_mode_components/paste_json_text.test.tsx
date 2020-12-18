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

import { PasteJsonText, FlyoutHeader, FlyoutBody, FlyoutFooter } from './paste_json_text';

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
    expect(wrapper.find(FlyoutHeader)).toHaveLength(1);
    expect(wrapper.find(FlyoutBody)).toHaveLength(1);
    expect(wrapper.find(FlyoutFooter)).toHaveLength(1);
  });

  describe('FlyoutHeader', () => {
    it('renders', () => {
      const wrapper = shallow(<FlyoutHeader />);
      expect(wrapper.find('h2').text()).toEqual('Create documents');
    });
  });

  describe('FlyoutBody', () => {
    it('renders and updates the textarea value', () => {
      setMockValues({ ...values, textInput: 'lorem ipsum' });
      const wrapper = shallow(<FlyoutBody />);
      const textarea = wrapper.find(EuiTextArea);

      expect(textarea.prop('value')).toEqual('lorem ipsum');

      textarea.simulate('change', { target: { value: 'dolor sit amet' } });
      expect(actions.setTextInput).toHaveBeenCalledWith('dolor sit amet');
    });
  });

  describe('FlyoutFooter', () => {
    it('closes the modal', () => {
      const wrapper = shallow(<FlyoutFooter />);

      wrapper.find(EuiButtonEmpty).simulate('click');
      expect(actions.closeDocumentCreation).toHaveBeenCalled();
    });

    it('disables/enables the Continue button based on whether text has been entered', () => {
      const wrapper = shallow(<FlyoutFooter />);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(false);

      setMockValues({ ...values, textInput: '' });
      rerender(wrapper);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(true);
    });
  });
});
