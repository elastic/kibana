/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { ChecksChart } from '../checks_chart';
import { StatusData } from '../../../../../common/graphql/types';

describe('ChecksChart', () => {
  it('passes check data to a chart', () => {
    const statusData: StatusData[] = [
      {
        x: 123,
        up: 1,
        down: 3,
        total: 4,
      },
      {
        x: 124,
        up: 2,
        down: 2,
        total: 4,
      },
      {
        x: 125,
        up: 1,
        down: 3,
        total: 4,
      },
    ];
    const component = shallowWithIntl(
      <ChecksChart dangerColor="foo" status={statusData} successColor="bar" />
    );
    expect(component).toMatchSnapshot();
  });
});
