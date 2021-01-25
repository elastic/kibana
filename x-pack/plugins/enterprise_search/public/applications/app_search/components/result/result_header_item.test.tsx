/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ResultHeaderItem } from './result_header_item';

describe('ResultHeaderItem', () => {
  it('renders', () => {
    const wrapper = mount(<ResultHeaderItem field="id" value="001" type="id" />);
    expect(wrapper.find('.appSearchResultHeaderItem__key').text()).toEqual('id');
    expect(wrapper.find('.appSearchResultHeaderItem__value').text()).toEqual('001');
  });

  it('will truncate long field names', () => {
    const wrapper = mount(
      <ResultHeaderItem
        field="a-really-really-really-really-field-name"
        value="001"
        type="string"
      />
    );
    expect(wrapper.find('.appSearchResultHeaderItem__key').text()).toEqual(
      'a-really-really-really-really-…'
    );
  });

  it('will truncate long values', () => {
    const wrapper = mount(
      <ResultHeaderItem field="foo" value="a-really-really-really-really-value" type="string" />
    );
    expect(wrapper.find('.appSearchResultHeaderItem__value').text()).toEqual(
      'a-really-really-really-really-…'
    );
  });

  it('will truncate long values from the beginning if the type is "id"', () => {
    const wrapper = mount(
      <ResultHeaderItem field="foo" value="a-really-really-really-really-value" type="id" />
    );
    expect(wrapper.find('.appSearchResultHeaderItem__value').text()).toEqual(
      '…lly-really-really-really-value'
    );
  });

  it('will round any numeric values that are passed in to 2 decimals, regardless of the explicit "type" passed', () => {
    const wrapper = mount(<ResultHeaderItem field="foo" value={5.19383718193} type="string" />);
    expect(wrapper.find('.appSearchResultHeaderItem__value').text()).toEqual('5.19');
  });

  it('if the value passed in is undefined, it will render "-"', () => {
    const wrapper = mount(<ResultHeaderItem field="foo" type="string" />);
    expect(wrapper.find('.appSearchResultHeaderItem__value').text()).toEqual('-');
  });
});
