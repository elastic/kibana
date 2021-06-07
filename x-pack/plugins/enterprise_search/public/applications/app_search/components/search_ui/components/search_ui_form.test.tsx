/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../utils', () => ({
  generatePreviewUrl: jest.fn(),
}));

import { setMockValues, setMockActions } from '../../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { ActiveField } from '../types';
import { generatePreviewUrl } from '../utils';

import { SearchUIForm } from './search_ui_form';

describe('SearchUIForm', () => {
  const values = {
    validFields: ['title', 'url', 'category', 'size'],
    validSortFields: ['title', 'url', 'category', 'size'],
    validFacetFields: ['title', 'url', 'category', 'size'],
    titleField: 'title',
    urlField: 'url',
    facetFields: ['category'],
    sortFields: ['size'],
  };
  const actions = {
    onActiveFieldChange: jest.fn(),
    onFacetFieldsChange: jest.fn(),
    onSortFieldsChange: jest.fn(),
    onTitleFieldChange: jest.fn(),
    onUrlFieldChange: jest.fn(),
  };

  beforeAll(() => {
    setMockValues(values);
    setMockActions(actions);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<SearchUIForm />);
    expect(wrapper.find('[data-test-subj="selectTitle"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="selectFilters"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="selectSort"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="selectUrl"]').exists()).toBe(true);
  });

  describe('title field', () => {
    const subject = () => shallow(<SearchUIForm />).find('[data-test-subj="selectTitle"]');

    it('renders with its value set from state', () => {
      setMockValues({
        ...values,
        titleField: 'foo',
      });

      expect(subject().prop('value')).toBe('foo');
    });

    it('updates state with new value when changed', () => {
      subject().simulate('change', { target: { value: 'foo' } });
      expect(actions.onTitleFieldChange).toHaveBeenCalledWith('foo');
    });

    it('updates active field in state on focus', () => {
      subject().simulate('focus');
      expect(actions.onActiveFieldChange).toHaveBeenCalledWith(ActiveField.Title);
    });

    it('removes active field in state on blur', () => {
      subject().simulate('blur');
      expect(actions.onActiveFieldChange).toHaveBeenCalledWith(ActiveField.None);
    });
  });

  describe('url field', () => {
    const subject = () => shallow(<SearchUIForm />).find('[data-test-subj="selectUrl"]');

    it('renders with its value set from state', () => {
      setMockValues({
        ...values,
        urlField: 'foo',
      });

      expect(subject().prop('value')).toBe('foo');
    });

    it('updates state with new value when changed', () => {
      subject().simulate('change', { target: { value: 'foo' } });
      expect(actions.onUrlFieldChange).toHaveBeenCalledWith('foo');
    });

    it('updates active field in state on focus', () => {
      subject().simulate('focus');
      expect(actions.onActiveFieldChange).toHaveBeenCalledWith(ActiveField.Url);
    });

    it('removes active field in state on blur', () => {
      subject().simulate('blur');
      expect(actions.onActiveFieldChange).toHaveBeenCalledWith(ActiveField.None);
    });
  });

  describe('filters field', () => {
    const subject = () => shallow(<SearchUIForm />).find('[data-test-subj="selectFilters"]');

    it('renders with its value set from state', () => {
      setMockValues({
        ...values,
        facetFields: ['foo'],
      });

      expect(subject().prop('selectedOptions')).toEqual([
        { label: 'foo', text: 'foo', value: 'foo' },
      ]);
    });

    it('updates state with new value when changed', () => {
      subject().simulate('change', [
        { label: 'foo', text: 'foo', value: 'foo' },
        { label: 'bar', text: 'bar', value: 'bar' },
      ]);
      expect(actions.onFacetFieldsChange).toHaveBeenCalledWith(['foo', 'bar']);
    });

    it('updates active field in state on focus', () => {
      subject().simulate('focus');
      expect(actions.onActiveFieldChange).toHaveBeenCalledWith(ActiveField.Filter);
    });

    it('removes active field in state on blur', () => {
      subject().simulate('blur');
      expect(actions.onActiveFieldChange).toHaveBeenCalledWith(ActiveField.None);
    });
  });

  describe('sorts field', () => {
    const subject = () => shallow(<SearchUIForm />).find('[data-test-subj="selectSort"]');

    it('renders with its value set from state', () => {
      setMockValues({
        ...values,
        sortFields: ['foo'],
      });

      expect(subject().prop('selectedOptions')).toEqual([
        { label: 'foo', text: 'foo', value: 'foo' },
      ]);
    });

    it('updates state with new value when changed', () => {
      subject().simulate('change', [
        { label: 'foo', text: 'foo', value: 'foo' },
        { label: 'bar', text: 'bar', value: 'bar' },
      ]);
      expect(actions.onSortFieldsChange).toHaveBeenCalledWith(['foo', 'bar']);
    });

    it('updates active field in state on focus', () => {
      subject().simulate('focus');
      expect(actions.onActiveFieldChange).toHaveBeenCalledWith(ActiveField.Sort);
    });

    it('removes active field in state on blur', () => {
      subject().simulate('blur');
      expect(actions.onActiveFieldChange).toHaveBeenCalledWith(ActiveField.None);
    });
  });

  it('includes a link to generate the preview', () => {
    (generatePreviewUrl as jest.Mock).mockReturnValue('http://www.example.com?foo=bar');

    setMockValues({
      ...values,
      urlField: 'foo',
      titleField: 'bar',
      facetFields: ['baz'],
      sortFields: ['qux'],
    });

    const subject = () =>
      shallow(<SearchUIForm />).find('[data-test-subj="generateSearchUiPreview"]');

    expect(subject().prop('href')).toBe('http://www.example.com?foo=bar');
    expect(generatePreviewUrl).toHaveBeenCalledWith({
      urlField: 'foo',
      titleField: 'bar',
      facets: ['baz'],
      sortFields: ['qux'],
    });
  });
});
