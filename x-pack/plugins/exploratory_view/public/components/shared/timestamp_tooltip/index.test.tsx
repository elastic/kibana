/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import moment from 'moment-timezone';
import { TimestampTooltip } from '.';

function mockNow(date: string | number | Date) {
  const fakeNow = new Date(date).getTime();
  return jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
}

describe('TimestampTooltip', () => {
  const timestamp = 1570720000123; // Oct 10, 2019, 08:06:40.123 (UTC-7)

  beforeAll(() => {
    // mock Date.now
    mockNow(1570737000000);

    moment.tz.setDefault('America/Los_Angeles');
  });

  afterAll(() => moment.tz.setDefault(''));

  it('should render component with absolute time in body and absolute time in tooltip', () => {
    expect(shallow(<TimestampTooltip time={timestamp} />)).toMatchInlineSnapshot(`
      <EuiToolTip
        content="Oct 10, 2019, 08:06:40.123 (UTC-7)"
        delay="regular"
        display="inlineBlock"
        position="top"
      >
        Oct 10, 2019, 08:06:40.123 (UTC-7)
      </EuiToolTip>
    `);
  });

  it('should format with precision in milliseconds by default', () => {
    expect(
      shallow(<TimestampTooltip time={timestamp} />)
        .find('EuiToolTip')
        .prop('content')
    ).toBe('Oct 10, 2019, 08:06:40.123 (UTC-7)');
  });

  it('should format with precision in seconds', () => {
    expect(
      shallow(<TimestampTooltip time={timestamp} timeUnit="seconds" />)
        .find('EuiToolTip')
        .prop('content')
    ).toBe('Oct 10, 2019, 08:06:40 (UTC-7)');
  });

  it('should format with precision in minutes', () => {
    expect(
      shallow(<TimestampTooltip time={timestamp} timeUnit="minutes" />)
        .find('EuiToolTip')
        .prop('content')
    ).toBe('Oct 10, 2019, 08:06 (UTC-7)');
  });
});
