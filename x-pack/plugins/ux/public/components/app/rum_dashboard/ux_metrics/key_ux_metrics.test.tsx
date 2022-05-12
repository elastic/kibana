/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, Matcher } from '@testing-library/react';
import * as fetcherHook from '../../../../hooks/use_fetcher';
import { KeyUXMetrics } from './key_ux_metrics';
import { FETCH_STATUS } from '@kbn/observability-plugin/public';

describe('KeyUXMetrics', () => {
  it('renders metrics with correct formats', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: {
        noOfLongTasks: 3.0009765625,
        sumOfLongTasks: 520.4375,
        longestLongTask: 271.4375,
      },
      status: FETCH_STATUS.SUCCESS,
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

    const checkText = (text: string): Matcher => {
      return (content: string, element?: Element | null) => {
        return Boolean(element?.textContent?.includes(text));
      };
    };

    // Tests include the word "info" between the task and time to account for the rendered text coming from
    // the EuiIcon (tooltip) embedded within each stat description
    expect(
      getAllByText(checkText('Longest long task durationInfo271 ms'))[0]
    ).toBeInTheDocument();
    expect(
      getAllByText(checkText('Total long tasks durationInfo520 ms'))[0]
    ).toBeInTheDocument();
    expect(
      getAllByText(checkText('No. of long tasksInfo3'))[0]
    ).toBeInTheDocument();
    expect(
      getAllByText(checkText('Total blocking timeInfo271 ms'))[0]
    ).toBeInTheDocument();
    expect(
      getAllByText(checkText('First contentful paintInfo1.27 s'))[0]
    ).toBeInTheDocument();
  });
});
