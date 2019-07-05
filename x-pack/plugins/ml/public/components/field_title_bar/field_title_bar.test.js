/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { FieldTitleBar } from './field_title_bar';

// helper to let PropTypes throw errors instead of just doing console.error()
const error = console.error;
console.error = (warning, ...args) => {
  if (/(Invalid prop|Failed prop type)/gi.test(warning)) {
    throw new Error(warning);
  }
  error.apply(console, [warning, ...args]);
};

describe('FieldTitleBar', () => {

  test(`throws an error because card is a required prop`, () => {
    expect(() => <FieldTitleBar />).toThrow();
  });

  test(`card prop is an empty object`, () => {
    const props = { card: {} };

    const wrapper = mountWithIntl(<FieldTitleBar {...props} />);

    const fieldName = wrapper.find({ className: 'field-name' }).text();
    expect(fieldName).toEqual('document count');

    const hasClassName = wrapper.find('EuiText').hasClass('document_count');
    expect(hasClassName).toBeTruthy();
  });

  test(`card.isUnsupportedType is true`, () => {
    const testFieldName = 'foo';
    const props = { card: { fieldName: testFieldName, isUnsupportedType: true } };

    const wrapper = mountWithIntl(<FieldTitleBar {...props} />);

    const fieldName = wrapper.find({ className: 'field-name' }).text();
    expect(fieldName).toEqual(testFieldName);

    const hasClassName = wrapper.find('EuiText').hasClass('type-other');
    expect(hasClassName).toBeTruthy();
  });

  test(`card.fieldName and card.type is set`, () => {
    const testFieldName = 'foo';
    const testType = 'bar';
    const props = { card: { fieldName: testFieldName, type: testType } };

    const wrapper = mountWithIntl(<FieldTitleBar {...props} />);

    const fieldName = wrapper.find({ className: 'field-name' }).text();
    expect(fieldName).toEqual(testFieldName);

    const hasClassName = wrapper.find('EuiText').hasClass(testType);
    expect(hasClassName).toBeTruthy();
  });

  test(`tooltip hovering`, () => {
    const props = { card: { fieldName: 'foo', type: 'bar' } };
    const wrapper = mountWithIntl(<FieldTitleBar {...props} />);
    const container = wrapper.find({ className: 'field-name' });

    expect(wrapper.find('EuiToolTip').children()).toHaveLength(1);

    container.simulate('mouseover');
    expect(wrapper.find('EuiToolTip').children()).toHaveLength(2);

    container.simulate('mouseout');
    expect(wrapper.find('EuiToolTip').children()).toHaveLength(1);
  });

});
