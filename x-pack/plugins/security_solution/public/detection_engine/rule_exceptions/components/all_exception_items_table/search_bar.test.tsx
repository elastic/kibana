/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionsViewerSearchBar } from './search_bar';

describe('ExceptionsViewerSearchBar', () => {
  it('it does not display add exception button if user is read only', () => {
    const wrapper = mount(
      <ExceptionsViewerSearchBar
        listType={ExceptionListTypeEnum.DETECTION}
        onSearch={jest.fn()}
        onAddExceptionClick={jest.fn()}
        isSearching={false}
        canAddException
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').exists()).toBeFalsy();
  });

  it('it invokes "onAddExceptionClick" when user selects to add an exception item', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ExceptionsViewerSearchBar
        canAddException={false}
        listType={ExceptionListTypeEnum.DETECTION}
        isSearching={false}
        onSearch={jest.fn()}
        onAddExceptionClick={mockOnAddExceptionClick}
      />
    );

    wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button').simulate('click');

    expect(wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').at(0).text()).toEqual(
      'Add rule exception'
    );
    expect(mockOnAddExceptionClick).toHaveBeenCalledWith('detection');
  });

  it('it invokes "onAddExceptionClick" when user selects to add an endpoint exception item', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ExceptionsViewerSearchBar
        canAddException={false}
        listType={ExceptionListTypeEnum.ENDPOINT}
        isSearching={false}
        onSearch={jest.fn()}
        onAddExceptionClick={mockOnAddExceptionClick}
      />
    );

    wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button').simulate('click');

    expect(wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').at(0).text()).toEqual(
      'Add endpoint exception'
    );
    expect(mockOnAddExceptionClick).toHaveBeenCalledWith('endpoint');
  });
});
