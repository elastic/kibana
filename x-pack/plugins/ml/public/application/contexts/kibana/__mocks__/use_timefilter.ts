/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { TimefilterContract } from '@kbn/data-plugin/public';

export const timefilterMock = dataPluginMock.createStartContract().query.timefilter
  .timefilter as jest.Mocked<TimefilterContract>;

export const createTimefilterMock = () => {
  return dataPluginMock.createStartContract().query.timefilter
    .timefilter as jest.Mocked<TimefilterContract>;
};

export const useTimefilter = jest.fn(() => {
  return timefilterMock;
});

export const useRefreshIntervalUpdates = jest.fn(() => {
  return {
    pause: false,
    value: 0,
  };
});

export const useTimeRangeUpdates = jest.fn(() => {
  return {
    from: '',
    to: '',
  };
});
