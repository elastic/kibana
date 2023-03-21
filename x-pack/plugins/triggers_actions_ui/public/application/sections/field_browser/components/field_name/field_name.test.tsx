/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { FieldName } from './field_name';

const timestampFieldId = '@timestamp';

const defaultProps = {
  fieldId: timestampFieldId,
};

describe('FieldName', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  test('it renders the field name', () => {
    const wrapper = mount(<FieldName {...defaultProps} />);

    expect(
      wrapper.find(`[data-test-subj="field-${timestampFieldId}-name"]`).first().text()
    ).toEqual(timestampFieldId);
  });

  test('it highlights the text specified by the `highlight` prop', () => {
    const highlight = 'stamp';

    const wrapper = mount(<FieldName {...{ ...defaultProps, highlight }} />);

    expect(wrapper.find('mark').first().text()).toEqual(highlight);
  });
});
