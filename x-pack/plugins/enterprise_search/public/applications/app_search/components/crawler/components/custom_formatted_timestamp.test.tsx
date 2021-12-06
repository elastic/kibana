/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { FormattedRelative } from '@kbn/i18n-react';

import { FormattedDateTime } from '../../../utils/formatted_date_time';

import { CustomFormattedTimestamp } from './custom_formatted_timestamp';

describe('CustomFormattedTimestamp', () => {
  const mockToday = jest
    .spyOn(global.Date, 'now')
    .mockImplementation(() => new Date('1970-01-02').valueOf());

  afterAll(() => mockToday.mockRestore());

  it('uses a relative time format (x minutes ago) if the timestamp is from today', () => {
    const wrapper = shallow(<CustomFormattedTimestamp timestamp="1970-01-02" />);

    expect(wrapper.find(FormattedRelative).prop('value')).toEqual(new Date('1970-01-02'));
  });

  it('uses a date if the timestamp is before today', () => {
    const wrapper = shallow(<CustomFormattedTimestamp timestamp="1970-01-01" />);

    expect(wrapper.find(FormattedDateTime).prop('date')).toEqual(new Date('1970-01-01'));
  });
});
