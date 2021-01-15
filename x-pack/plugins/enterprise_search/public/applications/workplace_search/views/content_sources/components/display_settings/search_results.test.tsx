/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../../__mocks__';
import { shallow } from 'enzyme';

import React from 'react';

import { exampleResult } from '../../../../__mocks__/content_sources.mock';

import { ExampleSearchResultGroup } from './example_search_result_group';
import { ExampleStandoutResult } from './example_standout_result';

import { LEAVE_UNASSIGNED_FIELD } from './constants';
import { SearchResults } from './search_results';

describe('SearchResults', () => {
  const { searchResultConfig } = exampleResult;
  const fieldOptions = [
    {
      value: 'foo',
      text: 'Foo',
    },
  ];
  const optionalFieldOptions = [
    {
      value: 'bar',
      text: 'Bar',
    },
  ];
  const toggleTitleFieldHover = jest.fn();
  const toggleSubtitleFieldHover = jest.fn();
  const toggleDescriptionFieldHover = jest.fn();
  const setTitleField = jest.fn();
  const setSubtitleField = jest.fn();
  const setDescriptionField = jest.fn();
  const setUrlField = jest.fn();
  const setColorField = jest.fn();

  beforeEach(() => {
    setMockActions({
      toggleTitleFieldHover,
      toggleSubtitleFieldHover,
      toggleDescriptionFieldHover,
      setTitleField,
      setSubtitleField,
      setDescriptionField,
      setUrlField,
      setColorField,
    });
    setMockValues({
      searchResultConfig,
      fieldOptions,
      optionalFieldOptions,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<SearchResults />);

    expect(wrapper.find(ExampleSearchResultGroup)).toHaveLength(1);
    expect(wrapper.find(ExampleStandoutResult)).toHaveLength(1);
  });

  it('calls setTitleField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="TitleFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.titleField } });

    expect(setTitleField).toHaveBeenCalled();
  });

  it('calls setUrlField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="UrlFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.urlField } });

    expect(setUrlField).toHaveBeenCalled();
  });

  it('calls setSubtitleField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="SubtitleFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.titleField } });

    expect(setSubtitleField).toHaveBeenCalledWith(searchResultConfig.titleField);
  });

  it('calls setDescriptionField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="DescriptionFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.descriptionField } });

    expect(setDescriptionField).toHaveBeenCalledWith(searchResultConfig.descriptionField);
  });

  it('handles blank fallbacks', () => {
    setMockValues({
      searchResultConfig: { detailFields: [] },
      fieldOptions,
      optionalFieldOptions,
    });
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="SubtitleFieldSelect"]')
      .simulate('change', { target: { value: LEAVE_UNASSIGNED_FIELD } });
    wrapper
      .find('[data-test-subj="DescriptionFieldSelect"]')
      .simulate('change', { target: { value: LEAVE_UNASSIGNED_FIELD } });

    expect(wrapper.find('[data-test-subj="UrlFieldSelect"]').prop('value')).toEqual('');
    expect(setSubtitleField).toHaveBeenCalledWith(null);
    expect(setDescriptionField).toHaveBeenCalledWith(null);
  });
});
