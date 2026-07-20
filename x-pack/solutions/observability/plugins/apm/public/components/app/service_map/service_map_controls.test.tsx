/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type {
  ControlGroupRuntimeState,
  ControlGroupStateBuilder,
} from '@kbn/control-group-renderer';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ServiceMapControls } from './service_map_controls';

type GetCreationOptions = (
  initialState: ControlGroupRuntimeState,
  builder: ControlGroupStateBuilder
) => Promise<unknown>;

const capturedProps: { getCreationOptions?: GetCreationOptions } = {};

jest.mock('@kbn/control-group-renderer', () => ({
  ControlGroupRenderer: jest.fn().mockImplementation((props) => {
    capturedProps.getCreationOptions = props.getCreationOptions;
    return <div data-testid="control-group-renderer" />;
  }),
}));

const dataView = { id: 'apm-data-view' } as DataView;
const baseProps = {
  dataView,
  timeRange: { from: 'now-15m', to: 'now' },
  filters: [],
  query: { query: '', language: 'kuery' as const },
  onFiltersChange: jest.fn(),
};

describe('ServiceMapControls', () => {
  beforeEach(() => {
    capturedProps.getCreationOptions = undefined;
  });

  it('configures single_select=true for service.environment and leaves the other controls multi-select', async () => {
    render(<ServiceMapControls {...baseProps} />);

    await waitFor(() => {
      expect(capturedProps.getCreationOptions).toBeDefined();
    });

    const addOptionsListControl = jest.fn();
    const builder = { addOptionsListControl } as unknown as ControlGroupStateBuilder;

    await capturedProps.getCreationOptions!({} as ControlGroupRuntimeState, builder);

    const callsByField = Object.fromEntries(
      addOptionsListControl.mock.calls.map(([, controlState]) => [
        controlState.field_name,
        controlState,
      ])
    );

    expect(callsByField['service.environment'].single_select).toBe(true);
    expect(callsByField['service.name'].single_select).toBeUndefined();
    expect(callsByField['cloud.region'].single_select).toBeUndefined();
    expect(callsByField['cloud.availability_zone'].single_select).toBeUndefined();
  });

  it('passes single_select from a custom controlsConfig through to the builder', async () => {
    render(
      <ServiceMapControls
        {...baseProps}
        controlsConfig={[
          {
            field_name: 'service.environment',
            title: 'Environment',
            width: 'small',
            grow: true,
            single_select: true,
          },
          {
            field_name: 'cloud.region',
            title: 'Cloud region',
            width: 'small',
            grow: true,
          },
        ]}
      />
    );

    await waitFor(() => {
      expect(capturedProps.getCreationOptions).toBeDefined();
    });

    const addOptionsListControl = jest.fn();
    const builder = { addOptionsListControl } as unknown as ControlGroupStateBuilder;

    await capturedProps.getCreationOptions!({} as ControlGroupRuntimeState, builder);

    expect(addOptionsListControl).toHaveBeenCalledTimes(2);
    const [envCall, regionCall] = addOptionsListControl.mock.calls;
    expect(envCall[1]).toMatchObject({ field_name: 'service.environment', single_select: true });
    expect(regionCall[1]).toMatchObject({ field_name: 'cloud.region' });
    expect(regionCall[1].single_select).toBeUndefined();
  });
});
