/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { TestProviders } from '../../mock';
import { useAlertPrevalence } from './use_alert_prevalence';
import { useGlobalTime } from '../use_global_time';

const from = '2022-07-28T08:20:18.966Z';
const to = '2022-07-28T08:20:18.966Z';
jest.mock('../use_global_time', () => {
  const actual = jest.requireActual('../use_global_time');
  return {
    ...actual,
    useGlobalTime: jest
      .fn()
      .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() }),
  };
});

describe('useAlertPrevalence', () => {
  beforeEach(() => jest.resetAllMocks());

  it('invokes useGlobalTime() with false to prevent global queries from being deleted when the component unmounts', () => {
    renderHook(
      () =>
        useAlertPrevalence({
          field: 'host.name',
          value: ['Host-byc3w6qlpo'],
          isActiveTimelines: false,
          signalIndexName: null,
          includeAlertIds: false,
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(useGlobalTime).toBeCalledWith(false);
  });
});
