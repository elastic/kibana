/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { SearchBar } from '.';

let onSearchMock: jest.Mock;

interface EuiFieldSearchPropsFake {
  onSearch(value: string): void;
}

describe('Search bar', () => {
  beforeEach(() => {
    onSearchMock = jest.fn();
  });

  const getElement = (defaultValue: string = '') => (
    <SearchBar defaultValue={defaultValue} onSearch={onSearchMock} />
  );

  it('should have a default value', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = mount(getElement(expectedDefaultValue));
    const defaultValue = element.find('[data-test-subj="searchField"]').first().props()
      .defaultValue;
    expect(defaultValue).toBe(expectedDefaultValue);
  });

  it('should dispatch search action when submit search field', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = mount(getElement());
    expect(onSearchMock).toHaveBeenCalledTimes(0);
    const searchFieldProps = element
      .find('[data-test-subj="searchField"]')
      .first()
      .props() as EuiFieldSearchPropsFake;

    searchFieldProps.onSearch(expectedDefaultValue);

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue);
  });

  it('should dispatch search action when click on button', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = mount(getElement(expectedDefaultValue));
    expect(onSearchMock).toHaveBeenCalledTimes(0);

    element.find('[data-test-subj="searchButton"]').first().simulate('click');
    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue);
  });
});
