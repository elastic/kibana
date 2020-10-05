/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext } from 'react';
import { ManageHasDataFetches } from './manage_has_data';
import { render } from '../utils/test_helper';
import * as fetcherHook from '../hooks/use_fetcher';
import * as hasDataHooks from '../hooks/has_data_hooks';
import { ObsvSharedContext } from '../context/shared_data';

let setDataValue = jest.fn();

function HelperComponent() {
  const { sharedData } = useContext(ObsvSharedContext);

  setDataValue(sharedData);

  return (
    <>
      {JSON.stringify(sharedData)}
      <ManageHasDataFetches />
    </>
  );
}

describe('Manage Has Data Component', () => {
  beforeEach(() => {
    setDataValue = jest.fn();
  });

  it('it returns no data when nothing is registered', () => {
    render(<HelperComponent />);

    expect(setDataValue).toHaveBeenCalledWith({
      hasAnyData: undefined,
      hasData: {
        apm: undefined,
        infra_logs: undefined,
        infra_metrics: undefined,
        uptime: undefined,
      },
    });
  });
  it('it returns all data', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: false,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    render(<HelperComponent />);

    expect(setDataValue).toHaveBeenCalledWith({
      hasAnyData: false,
      hasData: {
        apm: false,
        infra_logs: false,
        infra_metrics: false,
        uptime: false,
      },
    });
  });

  it('it returns apm data', () => {
    jest.spyOn(hasDataHooks, 'useApmHasData').mockReturnValue({
      data: true,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
    });

    render(<HelperComponent />);

    expect(setDataValue).toHaveBeenCalledWith({
      hasAnyData: true,
      hasData: {
        apm: true,
        infra_logs: false,
        infra_metrics: false,
        uptime: false,
      },
    });
  });
});
