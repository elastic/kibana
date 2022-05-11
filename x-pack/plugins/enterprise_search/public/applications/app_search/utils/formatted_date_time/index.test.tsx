/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mountWithIntl } from '../../../test_helpers';

import { FormattedDateTime } from '.';

describe('FormattedDateTime', () => {
  it('renders a standard i18n-friendly combined date & time stamp', () => {
    const date = new Date('1970-01-01T12:00:00');
    const wrapper = mountWithIntl(<FormattedDateTime date={date} />);

    expect(wrapper.text()).toEqual('Jan 1, 1970 12:00 PM');
  });

  it('does not render time if hideTime is passed', () => {
    const date = new Date('1970-01-01T12:00:00');
    const wrapper = mountWithIntl(<FormattedDateTime date={date} hideTime />);

    expect(wrapper.text()).toEqual('Jan 1, 1970');
  });
});
