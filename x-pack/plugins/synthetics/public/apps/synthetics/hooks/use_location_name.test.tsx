/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useLocationName } from './use_location_name';
import { WrappedHelper } from '../utils/testing';

describe('useMonitorListFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected label', () => {
    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper
          state={{
            serviceLocations: {
              locationsLoaded: true,
              loading: false,
              locations: [
                {
                  url: 'mockUrl',
                  id: 'us_central',
                  label: 'US Central',
                  isServiceManaged: true,
                },
                {
                  url: 'mockUrl',
                  id: 'us_east',
                  label: 'US East',
                  isServiceManaged: true,
                },
              ],
            },
          }}
        >
          {children}
        </WrappedHelper>
      );
    };

    const { result } = renderHook(
      () =>
        useLocationName({
          locationId: 'us_central',
        }),
      { wrapper: WrapperWithState }
    );
    expect(result.current).toEqual('US Central');
  });

  it('returns the location id if matching location cannot be found', () => {
    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper
          state={{
            serviceLocations: {
              locationsLoaded: true,
              loading: false,
              locations: [
                {
                  url: 'mockUrl',
                  id: 'us_central',
                  label: 'US Central',
                  isServiceManaged: true,
                },
                {
                  url: 'mockUrl',
                  id: 'us_east',
                  label: 'US East',
                  isServiceManaged: true,
                },
              ],
            },
          }}
        >
          {children}
        </WrappedHelper>
      );
    };

    const { result } = renderHook(
      () =>
        useLocationName({
          locationId: 'us_west',
        }),
      { wrapper: WrapperWithState }
    );
    expect(result.current).toEqual('us_west');
  });
});
