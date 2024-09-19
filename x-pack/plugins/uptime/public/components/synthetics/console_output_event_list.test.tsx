/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { JourneyStep } from '../../../common/runtime_types/ping/synthetics';
import { render } from '../../lib/helper/rtl_helpers';
import { ConsoleOutputEventList } from './console_output_event_list';

describe('ConsoleOutputEventList component', () => {
  let steps: JourneyStep[];

  beforeEach(() => {
    steps = [
      {
        '@timestamp': '123',
        _id: '1',
        monitor: {
          check_group: 'check_group',
          id: 'MON_ID',
          duration: {
            us: 10,
          },
          status: 'down',
          type: 'browser',
        },
        synthetics: {
          type: 'stderr',
        },
      },
      {
        '@timestamp': '124',
        _id: '2',
        monitor: {
          check_group: 'check_group',
          id: 'MON_ID',
          duration: {
            us: 10,
          },
          status: 'down',
          type: 'browser',
        },
        synthetics: {
          type: 'cmd/status',
        },
      },
      {
        '@timestamp': '124',
        _id: '2',
        monitor: {
          check_group: 'check_group',
          id: 'MON_ID',
          duration: {
            us: 10,
          },
          status: 'down',
          type: 'browser',
        },
        synthetics: {
          type: 'step/end',
        },
      },
      {
        '@timestamp': '125',
        _id: '3',
        monitor: {
          check_group: 'check_group',
          id: 'MON_ID',
          duration: {
            us: 10,
          },
          status: 'down',
          type: 'browser',
        },
        synthetics: {
          type: 'stdout',
        },
      },
    ];
  });

  it('renders a component per console event', () => {
    const { getByRole, getByText, queryByText } = render(
      <ConsoleOutputEventList
        journey={{
          checkGroup: 'check_group',
          loading: false,
          // 4 steps, three console, one step/end
          steps,
        }}
      />
    );
    expect(getByRole('heading').innerHTML).toBe('No steps ran');
    steps
      .filter((step) => step.synthetics.type !== 'step/end')
      .forEach((step) => {
        expect(getByText(step['@timestamp']));
        expect(getByText(step.synthetics.type));
      });
    expect(queryByText('step/end')).toBeNull();
  });
});
