/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import * as fetchers from '../../../state/api/monitor_management';
import { FETCH_STATUS, useFetcher as originalUseFetcher } from '@kbn/observability-plugin/public';
import { spyOnUseFetcher } from '../../../lib/helper/spy_use_fetcher';
import { Actions } from './actions';
import { DeleteMonitor } from './delete_monitor';
import {
  BrowserFields,
  ConfigKey,
  MonitorManagementListResult,
  SourceType,
} from '../../../../../common/runtime_types';

describe('<DeleteMonitor />', () => {
  const onUpdate = jest.fn();
  const useFetcher = spyOnUseFetcher({});

  it('calls delete monitor on monitor deletion', () => {
    useFetcher.mockImplementation(originalUseFetcher);
    const deleteMonitor = jest.spyOn(fetchers, 'deleteMonitor');
    const id = 'test-id';
    render(<DeleteMonitor configId={id} name="sample name" onUpdate={onUpdate} />);

    expect(deleteMonitor).not.toBeCalled();

    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(deleteMonitor).toBeCalledWith({ id });
  });

  it('calls set refresh when deletion is successful', () => {
    const id = 'test-id';
    const name = 'sample monitor';
    render(
      <Actions
        configId={id}
        name={name}
        onUpdate={onUpdate}
        monitors={
          [
            {
              id,
              attributes: {
                [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
                [ConfigKey.CONFIG_ID]: id,
              } as BrowserFields,
            },
          ] as unknown as MonitorManagementListResult['monitors']
        }
      />
    );

    fireEvent.click(screen.getByLabelText('Delete monitor'));

    expect(onUpdate).toHaveBeenCalled();
  });

  it('shows loading spinner while waiting for monitor to delete', () => {
    const id = 'test-id';
    useFetcher.mockReturnValue({
      data: {},
      status: FETCH_STATUS.LOADING,
      refetch: () => {},
    });
    render(
      <Actions
        configId={id}
        name="sample name"
        onUpdate={onUpdate}
        monitors={
          [
            {
              id,
              attributes: {
                [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
                [ConfigKey.CONFIG_ID]: id,
              } as BrowserFields,
            },
          ] as unknown as MonitorManagementListResult['monitors']
        }
      />
    );

    expect(screen.getByLabelText('Deleting monitor...')).toBeInTheDocument();
  });
});
