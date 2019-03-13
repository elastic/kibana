/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { get } from 'lodash/fp';
import * as React from 'react';

import { mockEcsData } from '../../../../mock';
import { getEmptyValue } from '../../../empty_value';

import { FormattedFieldValue } from './formatted_field';

describe('Events', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <FormattedFieldValue
        value={get('timestamp', mockEcsData[0])}
        fieldName="timestamp"
        fieldType="date"
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders a localized date tooltip for a field type of date that has a valid timestamp', () => {
    const wrapper = mount(
      <FormattedFieldValue
        value={get('timestamp', mockEcsData[0])}
        fieldName="timestamp"
        fieldType="date"
      />
    );

    expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').exists()).toEqual(true);
  });

  test('it does NOT render a localized date tooltip when field type is NOT date, even if it contains valid timestamp', () => {
    const wrapper = mount(
      <FormattedFieldValue
        value={get('timestamp', mockEcsData[0])}
        fieldName="timestamp"
        fieldType="text"
      />
    );

    expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').exists()).toEqual(false);
  });

  test('it does NOT render a localized date tooltip when field type is date, but it does NOT contains a valid timestamp', () => {
    const hasBadDate = {
      ...mockEcsData[0],
      timestamp: 'not a good first date',
    };

    const wrapper = mount(
      <FormattedFieldValue
        value={get('timestamp', hasBadDate)}
        fieldName="timestamp"
        fieldType="date"
      />
    );

    expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').exists()).toEqual(false);
  });

  test('it renders the value for a non-date field when the field is populated', () => {
    const wrapper = mount(
      <FormattedFieldValue
        value={get('event.module', mockEcsData[0])}
        fieldName="event.module"
        fieldType="text"
      />
    );

    expect(wrapper.text()).toEqual('nginx');
  });

  test('it renders placeholder text for a non-date field when the field is NOT populated', () => {
    const wrapper = mount(
      <FormattedFieldValue
        value={get('fake.field', mockEcsData[0])}
        fieldName="fake.field"
        fieldType="text"
      />
    );

    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
