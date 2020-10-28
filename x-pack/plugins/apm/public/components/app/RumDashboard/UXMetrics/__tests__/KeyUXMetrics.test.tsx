/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from '@testing-library/react';
import * as fetcherHook from '../../../../../hooks/useFetcher';
import { KeyUXMetrics } from '../KeyUXMetrics';

describe('KeyUXMetrics', () => {
  it('renders metrics with correct formats', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: {
        noOfLongTasks: 3.0009765625,
        sumOfLongTasks: 520.4375,
        longestLongTask: 271.4375,
      },
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const { getByText } = render(
      <KeyUXMetrics
        loading={false}
        data={{
          cls: '0.01',
          fid: 6,
          lcp: 1701.1142857142856,
          tbt: 270.915,
          fcp: 1273.6285714285714,
          lcpRanks: [69, 17, 14],
          fidRanks: [83, 6, 11],
          clsRanks: [90, 7, 3],
          coreVitalPages: 1000,
        }}
      />
    );

    expect(getByText('Longest long task duration 271 ms')).toBeInTheDocument();
    expect(getByText('Total long tasks duration 520 ms')).toBeInTheDocument();
    expect(getByText('No. of long tasks 3')).toBeInTheDocument();
    expect(getByText('Total blocking time 271 ms')).toBeInTheDocument();
    expect(getByText('First contentful paint 1.27 s')).toBeInTheDocument();
  });
});
