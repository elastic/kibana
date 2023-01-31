/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import * as fetchers from '../../../state/api/monitor_management';
import { Actions } from './actions';
import { DeleteMonitor } from './delete_monitor';
import {
  BrowserFields,
  ConfigKey,
  MonitorManagementListResult,
  SourceType,
} from '../../../../../common/runtime_types';

import { createRealStore } from '../../../lib/helper/helper_with_redux';

describe('<DeleteMonitor />', () => {
  const onUpdate = jest.fn();

  it('calls delete monitor on monitor deletion', async () => {
    const deleteMonitor = jest.spyOn(fetchers, 'deleteMonitor');
    const id = 'test-id';
    const store = createRealStore();
    render(<DeleteMonitor configId={id} name="sample name" onUpdate={onUpdate} />, {
      store,
    });

    const dispatchSpy = jest.spyOn(store, 'dispatch');

    expect(deleteMonitor).not.toBeCalled();

    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      payload: {
        id: 'test-id',
        name: 'sample name',
      },
      type: 'DELETE_MONITOR',
    });

    expect(store.getState().deleteMonitor.loading.includes(id)).toEqual(true);

    expect(await screen.findByLabelText('Loading')).toBeTruthy();
  });

  it('calls set refresh when deletion is successful', async () => {
    const id = 'test-id';
    const name = 'sample monitor';
    const store = createRealStore();

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
      />,
      { store }
    );

    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });

    expect(store.getState().deleteMonitor.deletedMonitorIds.includes(id)).toEqual(true);
  });
});
