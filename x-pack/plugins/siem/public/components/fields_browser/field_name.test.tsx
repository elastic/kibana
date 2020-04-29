/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { mockBrowserFields } from '../../containers/source/mock';
import { TestProviders } from '../../mock';
import { getColumnsWithTimestamp } from '../event_details/helpers';

import { FieldName } from './field_name';

const categoryId = 'base';
const timestampFieldId = '@timestamp';

describe('FieldName', () => {
  test('it renders the field name', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldName
          categoryId={categoryId}
          categoryColumns={getColumnsWithTimestamp({
            browserFields: mockBrowserFields,
            category: categoryId,
          })}
          fieldId={timestampFieldId}
          onUpdateColumns={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find(`[data-test-subj="field-name-${timestampFieldId}"]`)
        .first()
        .text()
    ).toEqual(timestampFieldId);
  });

  test('it renders a copy to clipboard action menu item a user hovers over the name', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldName
          categoryId={categoryId}
          categoryColumns={getColumnsWithTimestamp({
            browserFields: mockBrowserFields,
            category: categoryId,
          })}
          fieldId={timestampFieldId}
          onUpdateColumns={jest.fn()}
        />
      </TestProviders>
    );

    wrapper.simulate('mouseenter');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="copy-to-clipboard"]').exists()).toBe(true);
  });

  test('it highlights the text specified by the `highlight` prop', () => {
    const highlight = 'stamp';

    const wrapper = mount(
      <TestProviders>
        <FieldName
          categoryId={categoryId}
          categoryColumns={getColumnsWithTimestamp({
            browserFields: mockBrowserFields,
            category: categoryId,
          })}
          fieldId={timestampFieldId}
          highlight={highlight}
          onUpdateColumns={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('strong')
        .first()
        .text()
    ).toEqual(highlight);
  });
});
