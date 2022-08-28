/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import React from 'react';
import { render } from '@testing-library/react';
import { DateFormatter } from '.';
import { useDateFormat, useTimeZone } from '../../hooks/use_kibana_ui_settings';

const mockValidStringDate = '1 Jan 2022 00:00:00 GMT';
const mockInvalidStringDate = 'invalid date';

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

jest.mock('../../hooks/use_kibana_ui_settings');
const mockUseDateFormat = useDateFormat as jest.Mock;
const mockUseTimeZone = useTimeZone as jest.Mock;

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

describe('<DateFormatter />', () => {
  beforeEach(() => {
    mockUseDateFormat.mockImplementation(() => dateFormat);
    mockUseTimeZone.mockImplementation(() => 'UTC');
  });

  it(`should return date string in ${dateFormat} format for valid string date`, () => {
    const component = render(<DateFormatter date={mockValidStringDate} />);
    expect(component).toMatchSnapshot();
  });

  it(`should return date string in ${dateFormat} format for valid moment date`, () => {
    const component = render(<DateFormatter date={moment(mockValidStringDate)} />);
    expect(component).toMatchSnapshot();
  });

  it(`should return date string with custom format`, () => {
    const customDateFormat = 'MMM Do YY';
    const component = render(
      <DateFormatter date={mockValidStringDate} dateFormat={customDateFormat} />
    );
    expect(component).toMatchSnapshot();
  });

  it('should return EMPTY_VALUE for invalid string date', () => {
    const component = render(<DateFormatter date={mockInvalidStringDate} />);
    expect(component).toMatchSnapshot();
  });

  it('should return EMPTY_VALUE for invalid moment date', () => {
    const component = render(<DateFormatter date={moment(mockInvalidStringDate)} />);
    expect(component).toMatchSnapshot();
  });
});
