/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { mockBrowserFields, TestProviders } from '../../../../mock';
import { getColumnsWithTimestamp } from '../../../utils/helpers';

import { FieldName } from './field_name';

const categoryId = 'base';
const timestampFieldId = '@timestamp';

const defaultProps = {
  categoryId,
  categoryColumns: getColumnsWithTimestamp({
    browserFields: mockBrowserFields,
    category: categoryId,
  }),
  closePopOverTrigger: false,
  fieldId: timestampFieldId,
  handleClosePopOverTrigger: jest.fn(),
  hoverActionsOwnFocus: false,
  onCloseRequested: jest.fn(),
  onUpdateColumns: jest.fn(),
  setClosePopOverTrigger: jest.fn(),
};

describe('FieldName', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  test('it renders the field name', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldName {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="field-${timestampFieldId}-name"]`).first().text()
    ).toEqual(timestampFieldId);
  });

  test('it highlights the text specified by the `highlight` prop', () => {
    const highlight = 'stamp';

    const wrapper = mount(
      <TestProviders>
        <FieldName {...{ ...defaultProps, highlight }} />
      </TestProviders>
    );

    expect(wrapper.find('mark').first().text()).toEqual(highlight);
  });
});
