/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';
import { rerender } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiFilePicker, EuiButtonEmpty, EuiButton } from '@elastic/eui';

import { UploadJsonFile, ModalHeader, ModalBody, ModalFooter } from './upload_json_file';

describe('UploadJsonFile', () => {
  const values = {
    fileInput: [],
    hasFile: false,
    configuredLimits: {
      engine: {
        maxDocumentByteSize: 102400,
      },
    },
  };
  const actions = {
    setFileInput: jest.fn(),
    closeDocumentCreation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<UploadJsonFile />);
    expect(wrapper.find(ModalHeader)).toHaveLength(1);
    expect(wrapper.find(ModalBody)).toHaveLength(1);
    expect(wrapper.find(ModalFooter)).toHaveLength(1);
  });

  describe('ModalHeader', () => {
    it('renders', () => {
      const wrapper = shallow(<ModalHeader />);
      expect(wrapper.find('h2').text()).toEqual('Drag and drop .json');
    });
  });

  describe('ModalBody', () => {
    it('updates state when files are dropped in', () => {
      const wrapper = shallow(<ModalBody />);

      wrapper.find(EuiFilePicker).simulate('change', ['mock file']);
      expect(actions.setFileInput).toHaveBeenCalledWith(['mock file']);
    });
  });

  describe('ModalFooter', () => {
    it('closes the modal', () => {
      const wrapper = shallow(<ModalFooter />);

      wrapper.find(EuiButtonEmpty).simulate('click');
      expect(actions.closeDocumentCreation).toHaveBeenCalled();
    });

    it('disables/enables the Continue button based on whether files have been uploaded', () => {
      const wrapper = shallow(<ModalFooter />);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(true);

      setMockValues({ ...values, hasFile: true });
      rerender(wrapper);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(false);
    });
  });
});
