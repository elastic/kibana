/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ExceptionsViewerHeader } from './exceptions_viewer_header';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

describe('ExceptionsViewerHeader', () => {
  it('it renders all disabled if "isInitLoading" is true', () => {
    const wrapper = mount(
      <ExceptionsViewerHeader
        isReadOnly={false}
        isInitLoading={true}
        listType={ExceptionListTypeEnum.DETECTION}
        onFilterChange={jest.fn()}
        onAddExceptionClick={jest.fn()}
      />
    );

    expect(
      wrapper.find('input[data-test-subj="exceptionsHeaderSearch"]').at(0).prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button')
        .at(0)
        .prop('disabled')
    ).toBeTruthy();
  });

  it('it does not display add exception button if user is read only', () => {
    const wrapper = mount(
      <ExceptionsViewerHeader
        isInitLoading={false}
        listType={ExceptionListTypeEnum.DETECTION}
        onFilterChange={jest.fn()}
        onAddExceptionClick={jest.fn()}
        isReadOnly
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').exists()).toBeFalsy();
  });

  it('it invokes "onAddExceptionClick" when user selects to add an exception item', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ExceptionsViewerHeader
        isReadOnly={false}
        isInitLoading={false}
        listType={ExceptionListTypeEnum.DETECTION}
        onFilterChange={jest.fn()}
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
      <ExceptionsViewerHeader
        isReadOnly={false}
        isInitLoading={false}
        listType={ExceptionListTypeEnum.ENDPOINT}
        onFilterChange={jest.fn()}
        onAddExceptionClick={mockOnAddExceptionClick}
      />
    );

    wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button').simulate('click');

    expect(wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').at(0).text()).toEqual(
      'Add endpoint exception'
    );
    expect(mockOnAddExceptionClick).toHaveBeenCalledWith('endpoint');
  });

  it('it invokes "onFilterChange" when search used and "Enter" pressed', () => {
    const mockOnFilterChange = jest.fn();
    const wrapper = mount(
      <ExceptionsViewerHeader
        isReadOnly={false}
        isInitLoading={false}
        listType={ExceptionListTypeEnum.ENDPOINT}
        onFilterChange={mockOnFilterChange}
        onAddExceptionClick={jest.fn()}
      />
    );

    wrapper.find('EuiFieldSearch').at(0).simulate('keyup', {
      charCode: 13,
      code: 'Enter',
      key: 'Enter',
    });

    expect(mockOnFilterChange).toHaveBeenCalled();
  });
});
