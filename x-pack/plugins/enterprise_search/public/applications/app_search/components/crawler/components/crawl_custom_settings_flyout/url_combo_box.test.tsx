/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

jest.mock('@elastic/eui', () => ({
  ...(jest.requireActual('@elastic/eui') as object),
  useGeneratedHtmlId: jest.fn(() => 'test id'),
}));

import React from 'react';

import { ShallowWrapper, shallow } from 'enzyme';

import { EuiComboBox, EuiFormRow } from '@elastic/eui';

import { rerender } from '../../../../../test_helpers';

import { UrlComboBox } from './url_combo_box';

const DEFAULT_PROPS = {
  label: 'label text',
  selectedUrls: ['https://www.elastic.co'],
  onChange: jest.fn(),
};

const MOCK_VALUES = {
  // UrlComboBoxLogic
  isInvalid: false,
};

const MOCK_ACTIONS = {
  // UrlComboBoxLogic
  setIsInvalid: jest.fn(),
};

describe('UrlComboBox', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);
    wrapper = shallow(<UrlComboBox {...DEFAULT_PROPS} />);
  });

  it('is valid by default', () => {
    expect(wrapper.find(EuiFormRow).prop('error')).toBeUndefined();
    expect(wrapper.find(EuiComboBox).prop('isInvalid')).toEqual(false);
  });

  it('shows error messages when invalid', () => {
    setMockValues({
      isInvalid: true,
    });

    rerender(wrapper);

    expect(wrapper.find(EuiFormRow).prop('error')).toBeDefined();
    expect(wrapper.find(EuiComboBox).prop('isInvalid')).toEqual(true);
  });

  it('shows selected urls', () => {
    expect(wrapper.find(EuiComboBox).prop('selectedOptions')).toEqual([
      { label: 'https://www.elastic.co' },
    ]);
  });

  it('clears the invalid flag when the user types', () => {
    const onSearchChange = wrapper.find(EuiComboBox).prop('onSearchChange');

    if (onSearchChange) {
      onSearchChange('htt');
    }

    expect(MOCK_ACTIONS.setIsInvalid).toHaveBeenCalledWith(false);
  });

  it('returns selected urls in a callback on change', () => {
    const onChange = wrapper.find(EuiComboBox).prop('onChange');

    if (onChange) {
      onChange([{ label: 'https://elastic.co' }]);
    }

    expect(DEFAULT_PROPS.onChange).toHaveBeenCalledWith(['https://elastic.co']);
  });

  it('fails validation when user submits an invalid url', () => {
    const onCreateOption = wrapper.find(EuiComboBox).prop('onCreateOption');

    if (onCreateOption) {
      onCreateOption('not a url', []);
    }

    expect(MOCK_ACTIONS.setIsInvalid).toHaveBeenCalledWith(true);
  });

  it('fails validation when user submits a url with an invalid protocol', () => {
    const onCreateOption = wrapper.find(EuiComboBox).prop('onCreateOption');

    if (onCreateOption) {
      onCreateOption('invalidprotocol://swiftype.com', []);
    }

    expect(MOCK_ACTIONS.setIsInvalid).toHaveBeenCalledWith(true);
  });

  it('includes the new url with already selected url in a callback on create', () => {
    const onCreateOption = wrapper.find(EuiComboBox).prop('onCreateOption');

    if (onCreateOption) {
      onCreateOption('https://swiftype.com', []);
    }

    expect(MOCK_ACTIONS.setIsInvalid).toHaveBeenCalledWith(false);
    expect(DEFAULT_PROPS.onChange).toHaveBeenCalledWith([
      'https://www.elastic.co',
      'https://swiftype.com',
    ]);
  });
});
