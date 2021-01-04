/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from '@testing-library/react';
import * as fetcherHook from '../../../../../hooks/use_fetcher';
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
    const { getAllByText } = render(
      <KeyUXMetrics
        loading={false}
        data={{
          cls: 0.01,
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

    const checkText = (text: string) => {
      return (content: any, node: any) => {
        return node?.textContent?.includes(text);
      };
    };

    expect(
      getAllByText(checkText('Longest long task duration271 ms'))[0]
    ).toBeInTheDocument();
    expect(
      getAllByText(checkText('Total long tasks duration520 ms'))[0]
    ).toBeInTheDocument();
    expect(
      getAllByText(checkText('No. of long tasks3'))[0]
    ).toBeInTheDocument();
    expect(
      getAllByText(checkText('Total blocking time271 ms'))[0]
    ).toBeInTheDocument();
    expect(
      getAllByText(checkText('First contentful paint1.27 s'))[0]
    ).toBeInTheDocument();
  });
});
