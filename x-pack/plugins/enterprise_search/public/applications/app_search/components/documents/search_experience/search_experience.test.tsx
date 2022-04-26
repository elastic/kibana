/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/enterprise_search_url.mock';
import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

// @ts-expect-error types are not available for this package yet
import { SearchProvider, Facet } from '@elastic/react-search-ui';

jest.mock('../../../../shared/use_local_storage', () => ({
  useLocalStorage: jest.fn(),
}));
import { useLocalStorage } from '../../../../shared/use_local_storage';

import { CustomizationCallout } from './customization_callout';
import { CustomizationModal } from './customization_modal';
import { SearchExperienceContent } from './search_experience_content';
import { Fields } from './types';

import { SearchExperience } from '.';

describe('SearchExperience', () => {
  const values = {
    engine: {
      name: 'some-engine',
      apiKey: '1234',
      document_count: 50,
    },
  };
  const mockSetFields = jest.fn();
  const setFieldsInLocalStorage = (fields: Fields) => {
    (useLocalStorage as jest.Mock).mockImplementation(() => [fields, mockSetFields]);
  };

  beforeEach(() => {
    setFieldsInLocalStorage({
      filterFields: ['a', 'b', 'c'],
      sortFields: ['d', 'c'],
    });
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders', () => {
    const wrapper = shallow(<SearchExperience />);

    expect(wrapper.find(SearchProvider)).toHaveLength(1);
    expect(wrapper.find(SearchExperienceContent)).toHaveLength(1);
  });

  describe('when there are no selected filter fields', () => {
    let wrapper: ShallowWrapper;
    beforeEach(() => {
      setFieldsInLocalStorage({
        filterFields: [],
        sortFields: ['a', 'b'],
      });
      wrapper = shallow(<SearchExperience />);
    });

    it('shows a customize callout instead of a button if no fields are yet selected', () => {
      expect(wrapper.find(CustomizationCallout).exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="customize"]').exists()).toBe(false);
    });

    it('will show the customization modal when clicked', () => {
      expect(wrapper.find(CustomizationModal).exists()).toBe(false);
      wrapper.find(CustomizationCallout).simulate('click');

      expect(wrapper.find(CustomizationModal).exists()).toBe(true);
    });
  });

  describe('when there are selected filter fields', () => {
    let wrapper: ShallowWrapper;
    beforeEach(() => {
      setFieldsInLocalStorage({
        filterFields: ['a', 'b'],
        sortFields: ['a', 'b'],
      });
      wrapper = shallow(<SearchExperience />);
    });

    it('shows a customize button', () => {
      expect(wrapper.find(CustomizationCallout).exists()).toBe(false);
      expect(wrapper.find('[data-test-subj="customize"]').exists()).toBe(true);
    });
  });

  it('renders Facet components for filter fields', () => {
    setFieldsInLocalStorage({
      filterFields: ['a', 'b', 'c'],
      sortFields: [],
    });
    const wrapper = shallow(<SearchExperience />);
    expect(wrapper.find(Facet).length).toBe(3);
  });

  describe('customization modal', () => {
    it('has a customization modal which can be opened and closed', () => {
      const wrapper = shallow(<SearchExperience />);
      expect(wrapper.find(CustomizationModal).exists()).toBe(false);

      wrapper.find('[data-test-subj="customize"]').simulate('click');
      expect(wrapper.find(CustomizationModal).exists()).toBe(true);

      wrapper.find(CustomizationModal).prop('onClose')();
      expect(wrapper.find(CustomizationModal).exists()).toBe(false);
    });

    it('passes values from localStorage to the customization modal', () => {
      const wrapper = shallow(<SearchExperience />);
      wrapper.find('[data-test-subj="customize"]').simulate('click');
      expect(wrapper.find(CustomizationModal).prop('filterFields')).toEqual(['a', 'b', 'c']);
      expect(wrapper.find(CustomizationModal).prop('sortFields')).toEqual(['d', 'c']);
    });

    it('updates selected fields in localStorage and closes modal on save', () => {
      const wrapper = shallow(<SearchExperience />);
      wrapper.find('[data-test-subj="customize"]').simulate('click');
      wrapper.find(CustomizationModal).prop('onSave')({
        filterFields: ['new', 'filters'],
        sortFields: ['new', 'sorts'],
      });

      expect(mockSetFields).toHaveBeenCalledWith({
        filterFields: ['new', 'filters'],
        sortFields: ['new', 'sorts'],
      });

      expect(wrapper.find(CustomizationModal).exists()).toBe(false);
    });
  });
});
