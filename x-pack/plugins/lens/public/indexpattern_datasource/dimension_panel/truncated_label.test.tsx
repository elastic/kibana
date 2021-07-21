/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { TruncatedLabel } from './truncated_label';

describe('truncated_label', () => {
  it('displays passed label if shorter than passed labelLength', () => {
    const wrapper = mount(<TruncatedLabel search={''} label="example_field" length={20} />);
    expect(wrapper.text()).toEqual('example_field');
  });
  it('middle truncates label', () => {
    const wrapper = mount(
      <TruncatedLabel search={''} label="example_field.subcategory.subfield" length={20} />
    );
    expect(wrapper.text()).toEqual('example_f...subfield');
  });
  describe('with search value passed', () => {
    it('constructs truncated label when searching for the string of index = 0', () => {
      const wrapper = mount(
        <TruncatedLabel
          search={'example_field'}
          label="example_field.subcategory.subfield"
          length={20}
        />
      );
      expect(wrapper.text()).toEqual('example_field.sub...');
      expect(wrapper.find('mark').text()).toEqual('example_field');
    });
    it('constructs truncated label when searching for the string in the middle', () => {
      const wrapper = mount(
        <TruncatedLabel
          search={'ample_field'}
          label="example_field.subcategory.subfield"
          length={20}
        />
      );
      expect(wrapper.text()).toEqual('...ample_field.su...');
      expect(wrapper.find('mark').text()).toEqual('ample_field');
    });
    it('constructs truncated label when searching for the string at the end of the label', () => {
      const wrapper = mount(
        <TruncatedLabel search={'subf'} label="example_field.subcategory.subfield" length={20} />
      );
      expect(wrapper.text()).toEqual('...category.subfield');
      expect(wrapper.find('mark').text()).toEqual('subf');
    });

    it('constructs truncated label when searching for the string longer than the truncated length and highlights the whole content', () => {
      const wrapper = mount(
        <TruncatedLabel
          search={'xample_field.subcategory.subfie'}
          label="example_field.subcategory.subfield"
          length={20}
        />
      );
      expect(wrapper.text()).toEqual('...xample_field.s...');
      expect(wrapper.find('mark').text()).toEqual('...xample_field.s...');
    });
  });
});
