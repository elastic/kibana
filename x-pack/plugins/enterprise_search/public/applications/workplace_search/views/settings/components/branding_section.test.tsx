/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, mount } from 'enzyme';

import { EuiFilePicker, EuiConfirmModal } from '@elastic/eui';
import { nextTick } from '@kbn/test-jest-helpers';

jest.mock('../../../utils', () => ({
  readUploadedFileAsBase64: jest.fn(({ img }) => img),
}));
import { readUploadedFileAsBase64 } from '../../../utils';

import { RESET_IMAGE_TITLE } from '../constants';

import { BrandingSection, defaultLogo } from './branding_section';

describe('BrandingSection', () => {
  const stageImage = jest.fn();
  const saveImage = jest.fn();
  const resetImage = jest.fn();

  const props = {
    image: 'foo',
    imageType: 'logo' as 'logo',
    description: 'logo test',
    helpText: 'this is a logo',
    buttonLoading: false,
    stageImage,
    saveImage,
    resetImage,
  };

  it('renders logo', () => {
    const wrapper = mount(<BrandingSection {...props} />);

    expect(wrapper.find(EuiFilePicker)).toHaveLength(1);
  });

  it('renders icon copy', () => {
    const wrapper = shallow(<BrandingSection {...props} imageType="icon" />);
    wrapper.find('[data-test-subj="ResetImageButton"]').simulate('click');

    expect(wrapper.find(EuiConfirmModal).prop('title')).toEqual(RESET_IMAGE_TITLE);
  });

  it('renders default Workplace Search logo', () => {
    const wrapper = shallow(<BrandingSection {...props} image={null} />);

    expect(wrapper.find('img').prop('src')).toContain(defaultLogo);
  });

  describe('resetConfirmModal', () => {
    it('calls method and hides modal when modal confirmed', () => {
      const wrapper = shallow(<BrandingSection {...props} />);
      wrapper.find('[data-test-subj="ResetImageButton"]').simulate('click');
      wrapper.find(EuiConfirmModal).prop('onConfirm')!({} as any);

      expect(wrapper.find(EuiConfirmModal)).toHaveLength(0);
      expect(resetImage).toHaveBeenCalled();
    });
  });

  describe('handleUpload', () => {
    it('handles empty files', () => {
      const wrapper = shallow(<BrandingSection {...props} />);
      wrapper.find(EuiFilePicker).prop('onChange')!([] as any);

      expect(stageImage).toHaveBeenCalledWith(null);
    });

    it('handles image', async () => {
      const wrapper = shallow(<BrandingSection {...props} />);
      wrapper.find(EuiFilePicker).prop('onChange')!(['foo'] as any);

      expect(readUploadedFileAsBase64).toHaveBeenCalledWith('foo');
      await nextTick();
      expect(stageImage).toHaveBeenCalled();
    });
  });
});
