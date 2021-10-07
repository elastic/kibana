/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { allSeriesKey, reportTypeKey, UrlStorageContextProvider } from './use_series_storage';
import { renderHook } from '@testing-library/react-hooks';
import { useExpViewTimeRange } from './use_time_range';
import { ReportTypes } from '../configurations/constants';
import { createKbnUrlStateStorage } from '../../../../../../../../src/plugins/kibana_utils/public';

const mockSingleSeries = [
  {
    name: 'performance-distribution',
    dataType: 'ux',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
];

const mockMultipleSeries = [
  {
    name: 'performance-distribution',
    dataType: 'ux',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
  {
    name: 'kpi-over-time',
    dataType: 'synthetics',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
];

describe('useExpViewTimeRange', function () {
  const storage = createKbnUrlStateStorage({ useHash: false });
  storage.set(allSeriesKey, mockSingleSeries);
  storage.set(reportTypeKey, ReportTypes.KPI);

  function Wrapper() {
    return (
      <UrlStorageContextProvider storage={storage}>
        <div />
      </UrlStorageContextProvider>
    );
  }
  it.skip('should return expected result when there is one series', async function () {
    const { result } = renderHook(() => useExpViewTimeRange(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({});

    // expect(setData).toHaveBeenCalledTimes(2);
    // expect(setData).toHaveBeenLastCalledWith(
    //   expect.objectContaining({
    //     allSeries: [
    //       {
    //         name: 'performance-distribution',
    //         dataType: 'ux',
    //         breakdown: 'user_agent.name',
    //         time: { from: 'now-15m', to: 'now' },
    //       },
    //     ],
    //     firstSeries: {
    //       name: 'performance-distribution',
    //       dataType: 'ux',
    //       breakdown: 'user_agent.name',
    //       time: { from: 'now-15m', to: 'now' },
    //     },
    //   })
    // );
  });

  // it('should return expected result when there are multiple series series', function () {
  //   const setData = setupTestComponent(mockMultipleSeries);
  //
  //   expect(setData).toHaveBeenCalledTimes(2);
  //   expect(setData).toHaveBeenLastCalledWith(
  //     expect.objectContaining({
  //       allSeries: [
  //         {
  //           name: 'performance-distribution',
  //           dataType: 'ux',
  //           breakdown: 'user_agent.name',
  //           time: { from: 'now-15m', to: 'now' },
  //         },
  //         {
  //           name: 'kpi-over-time',
  //           dataType: 'synthetics',
  //           breakdown: 'user_agent.name',
  //           time: { from: 'now-15m', to: 'now' },
  //         },
  //       ],
  //       firstSeries: {
  //         name: 'performance-distribution',
  //         dataType: 'ux',
  //         breakdown: 'user_agent.name',
  //         time: { from: 'now-15m', to: 'now' },
  //       },
  //     })
  //   );
  // });
  //
  // it('should return expected result when there are no series', function () {
  //   const setData = setupTestComponent([]);
  //
  //   expect(setData).toHaveBeenCalledTimes(1);
  //   expect(setData).toHaveBeenLastCalledWith(
  //     expect.objectContaining({
  //       allSeries: [],
  //       firstSeries: undefined,
  //     })
  //   );
  // });
});
