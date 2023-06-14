/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FrequencyDescription } from './notification_action';
import { TestProviders } from '../../../../common/mock';

describe('getFrequencyDescription', () => {
  it('should return empty string if frequency is not specified', () => {
    const { container } = render(<FrequencyDescription />, {
      wrapper: TestProviders,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('should correctly handle "For each alert. Per rule run."', async () => {
    const frequency = { notifyWhen: 'onActiveAlert', summary: false, throttle: null } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('For each alert. Per rule run.')).toBeInTheDocument();
  });

  it('should correctly handle "Summary of alerts. Per rule run."', async () => {
    const frequency = { notifyWhen: 'onActiveAlert', summary: true, throttle: null } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Summary of alerts. Per rule run.')).toBeInTheDocument();
  });

  it('should return empty string if type is "onThrottleInterval" but throttle is not specified', () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: null } as const;

    const { container } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('should correctly handle "Once a second"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1s' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once a second')).toBeInTheDocument();
  });

  it('should correctly handle "Once in every # seconds"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '2s' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once in every 2 seconds')).toBeInTheDocument();
  });

  it('should correctly handle "Once a minute"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1m' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once a minute')).toBeInTheDocument();
  });

  it('should correctly handle "Once in every # minutes"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '2m' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once in every 2 minutes')).toBeInTheDocument();
  });

  it('should correctly handle "Once an hour"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once an hour')).toBeInTheDocument();
  });

  it('should correctly handle "Once in every # hours"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '2h' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once in every 2 hours')).toBeInTheDocument();
  });

  it('should correctly handle unknown time units', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1z' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Periodically')).toBeInTheDocument();
  });
});
