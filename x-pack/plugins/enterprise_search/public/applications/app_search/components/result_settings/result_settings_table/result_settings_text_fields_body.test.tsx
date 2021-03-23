/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiTableRow } from '@elastic/eui';

import { ResultSettingsTextFieldsBody } from './result_settings_text_fields_body';

describe('ResultSettingsTextFieldsBody', () => {
  const values = {
    textResultFields: {
      foo: {
        raw: false,
        snippet: true,
        snippetFallback: true,
        snippetSize: 15,
      },
      zoo: {
        raw: true,
        rawSize: 5,
        snippet: false,
        snippetFallback: false,
      },
      bar: {
        raw: true,
        rawSize: 5,
        snippet: false,
        snippetFallback: false,
      },
    },
  };

  const actions = {
    toggleRawForField: jest.fn(),
    updateRawSizeForField: jest.fn(),
    clearRawSizeForField: jest.fn(),
    // toggleSnippetForField: jest.fn(),
    // updateSnippetSizeForField: jest.fn(),
    // clearSnippetSizeForField: jest.fn(),
    // toggleSnippetFallbackForField: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  const getTableRows = (wrapper: ShallowWrapper) => wrapper.find(EuiTableRow);
  const getFirstTableRow = (wrapper: ShallowWrapper) => getTableRows(wrapper).at(0);

  it('renders a table row for each field, sorted by field name', () => {
    const wrapper = shallow(<ResultSettingsTextFieldsBody />);
    const tableRows = getTableRows(wrapper);

    expect(tableRows.length).toBe(3);
    expect(tableRows.at(0).find('[data-test-subj="ResultSettingFieldName"]').dive().text()).toEqual(
      'bar'
    );
    expect(tableRows.at(1).find('[data-test-subj="ResultSettingFieldName"]').dive().text()).toEqual(
      'foo'
    );
    expect(tableRows.at(2).find('[data-test-subj="ResultSettingFieldName"]').dive().text()).toEqual(
      'zoo'
    );
  });

  describe('the "raw" checkbox within each table row', () => {
    const getRawCheckbox = () => {
      const wrapper = shallow(<ResultSettingsTextFieldsBody />);
      const tableRow = getFirstTableRow(wrapper);
      return tableRow.find('[data-test-subj="ResultSettingRawCheckBox"]');
    };

    it("is rendered with it's checked property set from state", () => {
      const rawCheckbox = getRawCheckbox();
      expect(rawCheckbox.prop('checked')).toEqual(values.textResultFields.bar.raw);
    });

    it("calls 'toggleRawForField' when it is clicked by a user", () => {
      const rawCheckbox = getRawCheckbox();
      rawCheckbox.simulate('change');
      expect(actions.toggleRawForField).toHaveBeenCalledWith('bar');
    });
  });

  describe('the "max size" text field for "raw" values within each table row', () => {
    const setMockSettings = (settings: object) => {
      setMockValues({
        ...values,
        textResultFields: {
          ...values.textResultFields,
          bar: settings,
        },
      });
    };

    const getMaxSizeTextField = () => {
      const wrapper = shallow(<ResultSettingsTextFieldsBody />);
      const tableRow = getFirstTableRow(wrapper);
      return tableRow.find('[data-test-subj="ResultSettingRawMaxSize"]');
    };

    it("is rendered with it's value set from state", () => {
      const rawTextField = getMaxSizeTextField();
      expect(rawTextField.prop('value')).toEqual(values.textResultFields.bar.rawSize);
    });

    it('is has no value if no max size is set in state', () => {
      setMockSettings({
        raw: true,
        // no rawSize value is set here
        snippet: false,
        snippetFallback: false,
      });
      const rawTextField = getMaxSizeTextField();
      expect(rawTextField.prop('value')).toEqual('');
    });

    it('is disabled if the raw checkbox is unchecked', () => {
      setMockSettings({
        raw: false, // This is false, so the raw checkbox is unchecked
        snippet: false,
        snippetFallback: false,
      });
      const rawTextField = getMaxSizeTextField();
      expect(rawTextField.prop('disabled')).toEqual(true);
    });

    it('will update the raw size in state when it is changed', () => {
      const rawTextField = getMaxSizeTextField();
      rawTextField.simulate('change', { target: { value: '21' } });
      expect(actions.updateRawSizeForField).toHaveBeenCalledWith('bar', 21);
    });

    it('will clear the raw size in state when it is changed to a value other than a number', () => {
      const rawTextField = getMaxSizeTextField();
      rawTextField.simulate('change', { target: { value: '' } });
      expect(actions.clearRawSizeForField).toHaveBeenCalledWith('bar');
    });

    it('will update the raw size in state on blur', () => {
      const rawTextField = getMaxSizeTextField();
      rawTextField.simulate('blur', { target: { value: '21' } });
      expect(actions.updateRawSizeForField).toHaveBeenCalledWith('bar', 21);
    });

    it('will set the raw size in state on blur to the minimum possible value if it is changed to a value other than a number', () => {
      const rawTextField = getMaxSizeTextField();
      rawTextField.simulate('blur', { target: { value: '' } });
      expect(actions.updateRawSizeForField).toHaveBeenCalledWith('bar', 20);
    });

    it('will set the raw size in state on blur to the minimum possible value if it is changed to a number lower than the minimum', () => {
      const rawTextField = getMaxSizeTextField();
      rawTextField.simulate('blur', { target: { value: '1' } });
      expect(actions.updateRawSizeForField).toHaveBeenCalledWith('bar', 20);
    });

    it('will set the raw size in state on blur to the maximum possible value if it is changed to a number higher than the maximum', () => {
      const rawTextField = getMaxSizeTextField();
      rawTextField.simulate('blur', { target: { value: '2000' } });
      expect(actions.updateRawSizeForField).toHaveBeenCalledWith('bar', 1000);
    });
  });
});
