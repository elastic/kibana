/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '../../../../../../../../src/plugins/data/public/mocks';

export const timefilterMock = dataPluginMock.createStartContract().query.timefilter.timefilter;

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
