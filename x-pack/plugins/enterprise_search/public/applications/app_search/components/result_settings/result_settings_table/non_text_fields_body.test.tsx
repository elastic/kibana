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

import { NonTextFieldsBody } from './non_text_fields_body';

describe('NonTextFieldsBody', () => {
  const values = {
    nonTextResultFields: {
      foo: {
        raw: false,
      },
      zoo: {
        raw: true,
        rawSize: 5,
      },
      bar: {
        raw: true,
        rawSize: 5,
      },
    },
  };

  const actions = {
    toggleRawForField: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  const getTableRows = (wrapper: ShallowWrapper) => wrapper.find(EuiTableRow);
  const getBarTableRow = (wrapper: ShallowWrapper) => getTableRows(wrapper).at(0);

  it('renders a table row for each field, sorted by field name', () => {
    const wrapper = shallow(<NonTextFieldsBody />);
    const tableRows = getTableRows(wrapper);

    expect(tableRows.length).toBe(3);
    expect(
      tableRows.at(0).find('[data-test-subj="ResultSettingFieldName"]').render().text()
    ).toEqual('bar');
    expect(
      tableRows.at(1).find('[data-test-subj="ResultSettingFieldName"]').render().text()
    ).toEqual('foo');
    expect(
      tableRows.at(2).find('[data-test-subj="ResultSettingFieldName"]').render().text()
    ).toEqual('zoo');
  });

  describe('the "raw" checkbox within each table row', () => {
    const getRawCheckbox = () => {
      const wrapper = shallow(<NonTextFieldsBody />);
      const tableRow = getBarTableRow(wrapper);
      return tableRow.find('[data-test-subj="ResultSettingRawCheckBox"]');
    };

    it('is rendered with its checked property set from state', () => {
      const rawCheckbox = getRawCheckbox();
      expect(rawCheckbox.prop('checked')).toEqual(values.nonTextResultFields.bar.raw);
    });

    it("calls 'toggleRawForField' when it is clicked by a user", () => {
      const rawCheckbox = getRawCheckbox();
      rawCheckbox.simulate('change');
      expect(actions.toggleRawForField).toHaveBeenCalledWith('bar');
    });
  });
});
