/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiTableRow } from '@elastic/eui';

import { TextFieldsBody } from './text_fields_body';

describe('TextFieldsBody', () => {
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
    isSnippetAllowed: () => true,
  };

  const actions = {
    toggleRawForField: jest.fn(),
    updateRawSizeForField: jest.fn(),
    clearRawSizeForField: jest.fn(),
    toggleSnippetForField: jest.fn(),
    updateSnippetSizeForField: jest.fn(),
    clearSnippetSizeForField: jest.fn(),
    toggleSnippetFallbackForField: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  const getTableRows = (wrapper: ShallowWrapper) => wrapper.find(EuiTableRow);
  const getBarTableRow = (wrapper: ShallowWrapper) => getTableRows(wrapper).at(0);
  const getFooTableRow = (wrapper: ShallowWrapper) => getTableRows(wrapper).at(1);

  it('renders a table row for each field, sorted by field name', () => {
    const wrapper = shallow(<TextFieldsBody />);
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
      const wrapper = shallow(<TextFieldsBody />);
      const tableRow = getBarTableRow(wrapper);
      return tableRow.find('[data-test-subj="ResultSettingRawCheckBox"]');
    };

    it('is rendered with its checked property set from state', () => {
      const rawCheckbox = getRawCheckbox();
      expect(rawCheckbox.prop('checked')).toEqual(values.textResultFields.bar.raw);
    });

    it("calls 'toggleRawForField' when it is clicked by a user", () => {
      const rawCheckbox = getRawCheckbox();
      rawCheckbox.simulate('change');
      expect(actions.toggleRawForField).toHaveBeenCalledWith('bar');
    });
  });

  describe('the "snippet" checkbox within each table row', () => {
    const getSnippetCheckbox = () => {
      const wrapper = shallow(<TextFieldsBody />);
      const tableRow = getFooTableRow(wrapper);
      return tableRow.find('[data-test-subj="ResultSettingSnippetTextBox"]');
    };

    it('is rendered with its checked property set from state', () => {
      const snippetCheckbox = getSnippetCheckbox();
      expect(snippetCheckbox.prop('checked')).toEqual(values.textResultFields.foo.snippet);
    });

    it("calls 'toggleRawForField' when it is clicked by a user", () => {
      const snippetCheckbox = getSnippetCheckbox();
      snippetCheckbox.simulate('change');
      expect(actions.toggleSnippetForField).toHaveBeenCalledWith('foo');
    });

    describe('when "isSnippetAllowed" return false', () => {
      values.isSnippetAllowed = () => false;

      it('the snippet checkbox is disabled', () => {
        const snippetCheckbox = getSnippetCheckbox();
        expect(snippetCheckbox.prop('disabled')).toEqual(true);
      });
    });
  });

  describe('the "fallback" checkbox within each table row', () => {
    const getFallbackCheckbox = () => {
      const wrapper = shallow(<TextFieldsBody />);
      const tableRow = getFooTableRow(wrapper);
      return tableRow.find('[data-test-subj="ResultSettingFallbackTextBox"]');
    };

    it('is rendered with its checked property set from state', () => {
      const fallbackCheckbox = getFallbackCheckbox();
      expect(fallbackCheckbox.prop('checked')).toEqual(values.textResultFields.foo.snippetFallback);
    });

    it('is disabled if snippets are disabled for this field', () => {
      const wrapper = shallow(<TextFieldsBody />);
      const tableRow = getBarTableRow(wrapper);
      const fallbackCheckbox = tableRow.find('[data-test-subj="ResultSettingFallbackTextBox"]');
      expect(fallbackCheckbox.prop('disabled')).toEqual(true);
    });

    it("calls 'toggleSnippetFallbackForField' when it is clicked by a user", () => {
      const fallbackCheckbox = getFallbackCheckbox();
      fallbackCheckbox.simulate('change');
      expect(actions.toggleSnippetFallbackForField).toHaveBeenCalledWith('foo');
    });
  });
});
