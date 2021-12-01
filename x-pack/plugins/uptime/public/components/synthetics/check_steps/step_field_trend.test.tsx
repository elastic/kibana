/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getLast48Intervals, StepFieldTrend } from './step_field_trend';
import { render } from '../../../lib/helper/rtl_helpers';
import { JourneyStep } from '../../../../common/runtime_types';

const step: JourneyStep = {
  _id: 'docID',
  monitor: {
    check_group: 'check_group',
    duration: {
      us: 123,
    },
    id: 'id',
    status: 'up',
    type: 'browser',
    timespan: {
      gte: '2021-12-01T12:54:28.098Z',
      lt: '2021-12-01T12:55:28.098Z',
    },
  },
  synthetics: {
    step: {
      index: 4,
      status: 'succeeded',
      name: 'STEP_NAME',
      duration: {
        us: 9999,
      },
    },
    type: 'step/end',
  },
  '@timestamp': 'timestamp',
};

describe('StepFieldTrend', () => {
  it('it renders embeddable', async () => {
    const { findByText } = render(
      <StepFieldTrend step={step} field="step.duration.us" title="Step duration" />
    );

    expect(await findByText('Embeddable exploratory view')).toBeInTheDocument();
  });
});

describe('getLast48Intervals', () => {
  it('it returns expected values', () => {
    expect(getLast48Intervals(step)).toEqual({ from: 'now-48m', to: 'now' });
    step.monitor.timespan = {
      gte: '2021-12-01T12:55:38.098Z',
      lt: '2021-12-01T12:55:48.098Z',
    };
    expect(getLast48Intervals(step)).toEqual({ from: 'now-480s', to: 'now' });
    step.monitor.timespan = {
      gte: '2021-12-01T12:54:28.098Z',
      lt: '2021-12-01T13:55:28.098Z',
    };
    expect(getLast48Intervals(step)).toEqual({ from: 'now-48h', to: 'now' });
    step.monitor.timespan = {
      gte: '2021-12-01T12:54:28.098Z',
      lt: '2021-12-02T12:55:28.098Z',
    };
    expect(getLast48Intervals(step)).toEqual({ from: 'now-48d', to: 'now' });
  });
});
