/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../lib/helper/rtl_helpers';
import { spyOnUseFetcher } from '../../lib/helper/spy_use_fetcher';
import {
  SyntheticsCheckSteps,
  SyntheticsCheckStepsPageHeader,
  SyntheticsCheckStepsPageRightSideItem,
} from './synthetics_checks';

describe('SyntheticsCheckStepsPageHeader component', () => {
  it('returns the monitor name', () => {
    spyOnUseFetcher({
      details: {
        journey: {
          monitor: {
            name: 'test-name',
            id: 'test-id',
          },
        },
      },
    });
    const { getByText } = render(<SyntheticsCheckStepsPageHeader />);
    expect(getByText('test-name'));
  });

  it('returns the monitor ID when no name is provided', () => {
    spyOnUseFetcher({
      details: {
        journey: {
          monitor: {
            id: 'test-id',
          },
        },
      },
    });
    const { getByText } = render(<SyntheticsCheckStepsPageHeader />);
    expect(getByText('test-id'));
  });
});

describe('SyntheticsCheckStepsPageRightSideItem component', () => {
  it('returns null when there are no details', () => {
    spyOnUseFetcher(null);
    const { container } = render(<SyntheticsCheckStepsPageRightSideItem />);
    expect(container.firstChild).toBeNull();
  });

  it('renders navigation element if details exist', () => {
    spyOnUseFetcher({
      details: {
        timestamp: '20031104',
        journey: {
          monitor: {
            name: 'test-name',
            id: 'test-id',
          },
        },
      },
    });
    const { getByText } = render(<SyntheticsCheckStepsPageRightSideItem />);
    expect(getByText('Nov 4, 2003 12:00:00 AM'));
    expect(getByText('Next check'));
    expect(getByText('Previous check'));
  });
});

describe('SyntheticsCheckSteps component', () => {
  it('renders empty steps list', () => {
    const { getByText } = render(<SyntheticsCheckSteps />);
    expect(getByText('0 Steps - all failed or skipped'));
    expect(getByText('This journey did not contain any steps.'));
  });

  it('renders steps', () => {
    spyOnUseFetcher({
      steps: [
        {
          _id: 'step-1',
          '@timestamp': '123',
          monitor: {
            id: 'id',
            check_group: 'check-group',
          },
          synthetics: {
            type: 'step/end',
          },
        },
      ],
    });
    const { getByText } = render(<SyntheticsCheckSteps />);
    expect(getByText('1 Steps - all failed or skipped'));
  });
});
