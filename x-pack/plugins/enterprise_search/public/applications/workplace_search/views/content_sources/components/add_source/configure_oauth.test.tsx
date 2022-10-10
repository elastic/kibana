/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCheckboxGroup } from '@elastic/eui';

import { Loading } from '../../../../../shared/loading';

import { ConfigureOauth } from './configure_oauth';

describe('ConfigureOauth', () => {
  const onFormCreated = jest.fn();
  const getPreContentSourceConfigData = jest.fn();
  const setSelectedGithubOrganizations = jest.fn();
  const createContentSource = jest.fn((formSubmitSuccess, handleFormSubmitError) => {
    formSubmitSuccess();
    handleFormSubmitError();
  });

  const values = {
    currentServiceType: 'github',
    githubOrganizations: ['foo', 'bar'],
    selectedGithubOrganizationsMap: {},
    sectionLoading: false,
  };

  const props = {
    header: <h1>Header</h1>,
    name: 'Name',
    onFormCreated,
  };

  beforeEach(() => {
    setMockValues({ ...values });
    setMockActions({
      getPreContentSourceConfigData,
      setSelectedGithubOrganizations,
      createContentSource,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<ConfigureOauth {...props} />);

    expect(wrapper.find('form')).toHaveLength(1);
  });

  it('handles loading state', () => {
    setMockValues({ ...values, sectionLoading: true });
    const wrapper = shallow(<ConfigureOauth {...props} />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('handles checkbox change', () => {
    const wrapper = shallow(<ConfigureOauth {...props} />);
    const checkboxGroup = wrapper.find(EuiCheckboxGroup);
    checkboxGroup.simulate('change');

    expect(checkboxGroup.prop('options')).toEqual([
      {
        id: 'foo',
        label: 'foo',
      },
      {
        id: 'bar',
        label: 'bar',
      },
    ]);
    expect(setSelectedGithubOrganizations).toHaveBeenCalled();
  });

  it('handles form submission', () => {
    const wrapper = shallow(<ConfigureOauth {...props} />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(createContentSource).toHaveBeenCalled();
  });
});
