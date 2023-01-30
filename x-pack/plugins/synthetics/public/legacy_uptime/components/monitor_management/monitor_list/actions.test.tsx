/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import {
  MonitorManagementListResult,
  BrowserFields,
  ConfigKey,
  SourceType,
} from '../../../../../common/runtime_types';

import { Actions } from './actions';

describe('<Actions />', () => {
  const onUpdate = jest.fn();

  it('navigates to edit monitor flow on edit pencil', () => {
    render(
      <Actions
        configId="test-id"
        name="sample name"
        onUpdate={onUpdate}
        monitors={
          [
            {
              id: 'test-id',
              attributes: {
                [ConfigKey.CONFIG_ID]: 'test-id',
                [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
              } as BrowserFields,
            },
          ] as unknown as MonitorManagementListResult['monitors']
        }
      />
    );

    expect(screen.getByLabelText('Edit monitor')).toHaveAttribute(
      'href',
      '/app/uptime/edit-monitor/test-id'
    );
  });

  it('allows deleting for project monitors', () => {
    render(
      <Actions
        configId="test-id"
        name="sample name"
        onUpdate={onUpdate}
        monitors={
          [
            {
              id: 'test-id',
              [ConfigKey.CONFIG_ID]: 'test-id',
              attributes: {
                [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
              } as BrowserFields,
            },
          ] as unknown as MonitorManagementListResult['monitors']
        }
      />
    );

    expect(screen.getByLabelText('Delete monitor')).not.toBeDisabled();
  });
});
