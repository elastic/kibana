/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../../../__mocks__/kea.mock';
import { setMockValues } from '../../../../__mocks__';
import '../../../../__mocks__/enterprise_search_url.mock';

const mockSetFields = jest.fn();

jest.mock('../../../../shared/use_local_storage', () => ({
  useLocalStorage: jest.fn(() => [
    {
      filterFields: ['a', 'b', 'c'],
      sortFields: ['d', 'c'],
    },
    mockSetFields,
  ]),
}));

import React from 'react';
// @ts-expect-error types are not available for this package yet
import { SearchProvider } from '@elastic/react-search-ui';
import { shallow } from 'enzyme';

import { CustomizationCallout } from './customization_callout';
import { CustomizationModal } from './customization_modal';

import { SearchExperience } from './search_experience';

describe('SearchExperience', () => {
  const values = {
    engine: {
      name: 'some-engine',
      apiKey: '1234',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders', () => {
    const wrapper = shallow(<SearchExperience />);
    expect(wrapper.find(SearchProvider).length).toBe(1);
  });

  describe('customization modal', () => {
    it('has a customization modal which can be opened and closed', () => {
      const wrapper = shallow(<SearchExperience />);
      expect(wrapper.find(CustomizationModal).exists()).toBe(false);

      wrapper.find(CustomizationCallout).simulate('click');
      expect(wrapper.find(CustomizationModal).exists()).toBe(true);

      wrapper.find(CustomizationModal).prop('onClose')();
      expect(wrapper.find(CustomizationModal).exists()).toBe(false);
    });

    it('passes values from localStorage to the customization modal', () => {
      const wrapper = shallow(<SearchExperience />);
      wrapper.find(CustomizationCallout).simulate('click');
      expect(wrapper.find(CustomizationModal).prop('filterFields')).toEqual(['a', 'b', 'c']);
      expect(wrapper.find(CustomizationModal).prop('sortFields')).toEqual(['d', 'c']);
    });

    it('updates selected fields in localStorage and closes modal on save', () => {
      const wrapper = shallow(<SearchExperience />);
      wrapper.find(CustomizationCallout).simulate('click');
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
