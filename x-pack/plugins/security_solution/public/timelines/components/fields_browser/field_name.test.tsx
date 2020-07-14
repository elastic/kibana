/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { mockBrowserFields } from '../../../common/containers/source/mock';
import { TestProviders } from '../../../common/mock';
import { getColumnsWithTimestamp } from '../../../common/components/event_details/helpers';

import { FieldName } from './field_name';

const categoryId = 'base';
const timestampFieldId = '@timestamp';

const defaultProps = {
  categoryId,
  categoryColumns: getColumnsWithTimestamp({
    browserFields: mockBrowserFields,
    category: categoryId,
  }),
  fieldId: timestampFieldId,
  onUpdateColumns: jest.fn(),
};

describe('FieldName', () => {
  test('it renders the field name', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldName {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="field-name-${timestampFieldId}"]`).first().text()
    ).toEqual(timestampFieldId);
  });

  test('it renders a copy to clipboard action menu item a user hovers over the name', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldName {...defaultProps} />
      </TestProviders>
    );
    wrapper.find('div').at(1).simulate('mouseenter');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="copy-to-clipboard"]').exists()).toBe(true);
  });

  test('it highlights the text specified by the `highlight` prop', () => {
    const highlight = 'stamp';

    const wrapper = mount(
      <TestProviders>
        <FieldName {...{ ...defaultProps, highlight }} />
      </TestProviders>
    );

    expect(wrapper.find('strong').first().text()).toEqual(highlight);
  });
});
