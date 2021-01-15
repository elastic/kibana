/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions, rerender } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiFilePicker, EuiButtonEmpty, EuiButton } from '@elastic/eui';

import { Errors } from '../creation_response_components';
import { UploadJsonFile, FlyoutHeader, FlyoutBody, FlyoutFooter } from './upload_json_file';

describe('UploadJsonFile', () => {
  const mockFile = new File(['mock'], 'mock.json', { type: 'application/json' });
  const values = {
    fileInput: null,
    isUploading: false,
    errors: [],
    configuredLimits: {
      engine: {
        maxDocumentByteSize: 102400,
      },
    },
  };
  const actions = {
    setFileInput: jest.fn(),
    onSubmitFile: jest.fn(),
    closeDocumentCreation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<UploadJsonFile />);
    expect(wrapper.find(FlyoutHeader)).toHaveLength(1);
    expect(wrapper.find(FlyoutBody)).toHaveLength(1);
    expect(wrapper.find(FlyoutFooter)).toHaveLength(1);
  });

  describe('FlyoutHeader', () => {
    it('renders', () => {
      const wrapper = shallow(<FlyoutHeader />);
      expect(wrapper.find('h2').text()).toEqual('Drag and drop .json');
    });
  });

  describe('FlyoutBody', () => {
    it('updates fileInput when files are added & removed', () => {
      const wrapper = shallow(<FlyoutBody />);

      wrapper.find(EuiFilePicker).simulate('change', [mockFile]);
      expect(actions.setFileInput).toHaveBeenCalledWith(mockFile);

      wrapper.find(EuiFilePicker).simulate('change', []);
      expect(actions.setFileInput).toHaveBeenCalledWith(null);
    });

    it('sets isLoading based on isUploading', () => {
      const wrapper = shallow(<FlyoutBody />);
      expect(wrapper.find(EuiFilePicker).prop('isLoading')).toBe(false);

      setMockValues({ ...values, isUploading: true });
      rerender(wrapper);
      expect(wrapper.find(EuiFilePicker).prop('isLoading')).toBe(true);
    });

    it('shows an error banner and sets invalid form props if errors exist', () => {
      const wrapper = shallow(<FlyoutBody />);
      expect(wrapper.find(EuiFilePicker).prop('isInvalid')).toBe(false);

      setMockValues({ ...values, errors: ['some error'] });
      rerender(wrapper);
      expect(wrapper.find(EuiFilePicker).prop('isInvalid')).toBe(true);
      expect(wrapper.prop('banner').type).toEqual(Errors);
    });
  });

  describe('FlyoutFooter', () => {
    it('closes the flyout', () => {
      const wrapper = shallow(<FlyoutFooter />);

      wrapper.find(EuiButtonEmpty).simulate('click');
      expect(actions.closeDocumentCreation).toHaveBeenCalled();
    });

    it('submits the json file', () => {
      const wrapper = shallow(<FlyoutFooter />);

      wrapper.find(EuiButton).simulate('click');
      expect(actions.onSubmitFile).toHaveBeenCalled();
    });

    it('disables/enables the Continue button based on whether files have been uploaded', () => {
      const wrapper = shallow(<FlyoutFooter />);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(true);

      setMockValues({ ...values, fineInput: mockFile });
      rerender(wrapper);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(true);
    });

    it('sets isLoading based on isUploading', () => {
      const wrapper = shallow(<FlyoutFooter />);
      expect(wrapper.find(EuiButton).prop('isLoading')).toBe(false);

      setMockValues({ ...values, isUploading: true });
      rerender(wrapper);
      expect(wrapper.find(EuiButton).prop('isLoading')).toBe(true);
    });
  });
});
