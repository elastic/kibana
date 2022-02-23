/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { JourneyStep } from '../../../../common/runtime_types/ping';
import { StepsList } from './steps_list';
import { render, forDesktopOnly, forMobileOnly } from '../../../lib/helper/rtl_helpers';
import { VIEW_PERFORMANCE } from '../../monitor/synthetics/translations';

describe('StepList component', () => {
  let steps: JourneyStep[];

  beforeEach(() => {
    steps = [
      {
        _id: '1',
        '@timestamp': '123',
        monitor: {
          id: 'MON_ID',
          duration: {
            us: 10,
          },
          status: 'down',
          type: 'browser',
          check_group: 'fake-group',
        },
        synthetics: {
          payload: {
            status: 'failed',
          },
          type: 'step/end',
          step: {
            name: 'load page',
            index: 1,
            status: 'succeeded',
            duration: {
              us: 9999,
            },
          },
        },
      },
      {
        _id: '2',
        '@timestamp': '124',
        monitor: {
          id: 'MON_ID',
          duration: {
            us: 10,
          },
          status: 'down',
          type: 'browser',
          check_group: 'fake-group-1',
        },
        synthetics: {
          payload: {
            status: 'failed',
          },
          type: 'step/end',
          step: {
            name: 'go to login',
            index: 2,
            status: 'succeeded',
            duration: {
              us: 9999,
            },
          },
        },
      },
    ];
  });

  it('creates expected message for all failed', () => {
    const { getByText } = render(<StepsList data={steps} loading={false} />);
    expect(getByText('2 Steps - all failed or skipped'));
  });

  it('renders a link to the step detail view', () => {
    const { getByTitle, getByTestId } = render(<StepsList data={[steps[0]]} loading={false} />);
    expect(getByTestId('step-detail-link')).toHaveAttribute('href', '/journey/fake-group/step/1');
    expect(forDesktopOnly(getByTitle, 'title')(`Failed`));
  });

  it.each([
    ['succeeded', 'Succeeded'],
    ['failed', 'Failed'],
    ['skipped', 'Skipped'],
  ])('supplies status badge correct status', (status, expectedStatus) => {
    const step = steps[0];
    step.synthetics!.payload!.status = status;
    const { getByText } = render(<StepsList data={[step]} loading={false} />);
    expect(forDesktopOnly(getByText)(expectedStatus));
  });

  it('creates expected message for all succeeded', () => {
    steps[0].synthetics!.payload!.status = 'succeeded';
    steps[1].synthetics!.payload!.status = 'succeeded';

    const { getByText } = render(<StepsList data={steps} loading={false} />);
    expect(getByText('2 Steps - all succeeded'));
  });

  it('creates appropriate message for mixed results', () => {
    steps[0].synthetics!.payload!.status = 'succeeded';

    const { getByText } = render(<StepsList data={steps} loading={false} />);
    expect(getByText('2 Steps - 1 succeeded'));
  });

  it('tallies skipped steps', () => {
    steps[0].synthetics!.payload!.status = 'succeeded';
    steps[1].synthetics!.payload!.status = 'skipped';

    const { getByText } = render(<StepsList data={steps} loading={false} />);
    expect(getByText('2 Steps - 1 succeeded'));
  });

  it('uses appropriate count when non-step/end steps are included', () => {
    steps[0].synthetics!.payload!.status = 'succeeded';
    steps.push({
      _id: '3',
      '@timestamp': '125',
      monitor: {
        id: 'MON_ID',
        duration: {
          us: 10,
        },
        status: 'down',
        type: 'browser',
        check_group: 'fake-group-2',
      },
      synthetics: {
        type: 'stderr',
        error: {
          message: `there was an error, that's all we know`,
          stack: 'your.error.happened.here',
        },
      },
    });

    const { getByText } = render(<StepsList data={steps} loading={false} />);
    expect(getByText('2 Steps - 1 succeeded'));
  });

  it('renders a row per step', () => {
    const { getByTestId } = render(<StepsList data={steps} loading={false} />);
    expect(getByTestId('row-fake-group'));
    expect(getByTestId('row-fake-group-1'));
  });

  describe('Mobile Designs', () => {
    // We don't need to resize the window here because EUI
    // does all the manipulation of what is displayed through
    // CSS. Therefore, it's enough to check what's actually
    // rendered and its classes.

    it('renders the step name and index', () => {
      const { getByText } = render(<StepsList data={steps} loading={false} />);
      expect(forMobileOnly(getByText)('1. load page')).toBeInTheDocument();
      expect(forMobileOnly(getByText)('2. go to login')).toBeInTheDocument();
    });

    it('does not render the link to view step details', async () => {
      const { queryByText } = render(<StepsList data={steps} loading={false} />);
      expect(forMobileOnly(queryByText)(VIEW_PERFORMANCE)).not.toBeInTheDocument();
    });

    it('renders the status label', () => {
      steps[0].synthetics!.payload!.status = 'succeeded';
      steps[1].synthetics!.payload!.status = 'skipped';

      const { getByText } = render(<StepsList data={steps} loading={false} />);
      expect(forMobileOnly(getByText)('Succeeded')).toBeInTheDocument();
      expect(forMobileOnly(getByText)('Skipped')).toBeInTheDocument();
    });
  });
});
