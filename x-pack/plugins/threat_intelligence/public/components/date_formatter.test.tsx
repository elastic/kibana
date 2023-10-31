/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import React from 'react';
import { render } from '@testing-library/react';
import { DateFormatter } from './date_formatter';
import { useDateFormat, useTimeZone } from '../hooks/use_kibana_ui_settings';

const mockValidStringDate = '1 Jan 2022 00:00:00 GMT';
const mockInvalidStringDate = 'invalid date';

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

jest.mock('../hooks/use_kibana_ui_settings');
const mockUseDateFormat = useDateFormat as jest.Mock;
const mockUseTimeZone = useTimeZone as jest.Mock;

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

describe('<DateFormatter />', () => {
  beforeEach(() => {
    mockUseDateFormat.mockImplementation(() => dateFormat);
    mockUseTimeZone.mockImplementation(() => 'UTC');
  });

  it(`should return date string in ${dateFormat} format for valid string date`, () => {
    const { asFragment } = render(<DateFormatter date={mockValidStringDate} />);
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        Jan 1, 2022 @ 00:00:00.000
      </DocumentFragment>
    `);
  });

  it(`should return date string in ${dateFormat} format for valid moment date`, () => {
    const { asFragment } = render(<DateFormatter date={moment(mockValidStringDate)} />);
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        Jan 1, 2022 @ 00:00:00.000
      </DocumentFragment>
    `);
  });

  it(`should return date string with custom format`, () => {
    const customDateFormat = 'MMM Do YY';
    const { asFragment } = render(
      <DateFormatter date={mockValidStringDate} dateFormat={customDateFormat} />
    );
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        Jan 1st 22
      </DocumentFragment>
    `);
  });

  it('should return EMPTY_VALUE for invalid string date', () => {
    const { asFragment } = render(<DateFormatter date={mockInvalidStringDate} />);
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        -
      </DocumentFragment>
    `);
  });

  it('should return EMPTY_VALUE for invalid moment date', () => {
    const { asFragment } = render(<DateFormatter date={moment(mockInvalidStringDate)} />);
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        -
      </DocumentFragment>
    `);
  });
});
