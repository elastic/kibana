/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { MonitorListStatusColumn } from '../monitor_list_status_column';

describe('MonitorListStatusColumn', () => {
  it('provides expected tooltip and display times', () => {
    const component = shallowWithIntl(
      <MonitorListStatusColumn
        absoluteTime="Thu May 09 2019 10:15:11 GMT-0400"
        relativeTime="a few seconds ago"
        status="up"
      />
    );
    expect(component).toMatchSnapshot();
  });
});
