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
  const defaultProps = {
    font: '14px Inter',
    // jest-canvas-mock mocks measureText as the number of string characters, thats why the width is so low
    width: 30,
    search: '',
    label: 'example_field',
  };
  it('displays passed label if shorter than passed labelLength', () => {
    const wrapper = mount(<TruncatedLabel {...defaultProps} />);
    expect(wrapper.text()).toEqual('example_field');
  });
  it('middle truncates label', () => {
    const wrapper = mount(
      <TruncatedLabel {...defaultProps} label="example_space.example_field.subcategory.subfield" />
    );
    expect(wrapper.text()).toEqual('example_….subcategory.subfield');
  });
  describe('with search value passed', () => {
    it('constructs truncated label when searching for the string of index = 0', () => {
      const wrapper = mount(
        <TruncatedLabel
          {...defaultProps}
          search="example_space"
          label="example_space.example_field.subcategory.subfield"
        />
      );
      expect(wrapper.text()).toEqual('example_space.example_field.s…');
      expect(wrapper.find('mark').text()).toEqual('example_space');
    });
    it('constructs truncated label when searching for the string in the middle', () => {
      const wrapper = mount(
        <TruncatedLabel
          {...defaultProps}
          search={'ample_field'}
          label="example_space.example_field.subcategory.subfield"
        />
      );
      expect(wrapper.text()).toEqual('…ample_field.subcategory.subf…');
      expect(wrapper.find('mark').text()).toEqual('ample_field');
    });
    it('constructs truncated label when searching for the string at the end of the label', () => {
      const wrapper = mount(
        <TruncatedLabel
          {...defaultProps}
          search={'subf'}
          label="example_space.example_field.subcategory.subfield"
        />
      );
      expect(wrapper.text()).toEqual('…le_field.subcategory.subfield');
      expect(wrapper.find('mark').text()).toEqual('subf');
    });

    it('constructs truncated label when searching for the string longer than the truncated width and highlights the whole content', () => {
      const wrapper = mount(
        <TruncatedLabel
          {...defaultProps}
          search={'ample_space.example_field.subcategory.subfie'}
          label="example_space.example_field.subcategory.subfield"
        />
      );
      expect(wrapper.text()).toEqual('…ample_space.example_field.su…');
      expect(wrapper.find('mark').text()).toEqual('…ample_space.example_field.su…');
    });
  });
});
