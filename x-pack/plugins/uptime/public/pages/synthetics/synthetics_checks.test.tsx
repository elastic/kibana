/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../lib/helper/rtl_helpers';
import {
  SyntheticsCheckSteps,
  SyntheticsCheckStepsPageHeader,
  SyntheticsCheckStepsPageRightSideItem,
} from './synthetics_checks';
import { fetchJourneySteps } from '../../state/api/journey';
import { createMemoryHistory } from 'history';
import { SYNTHETIC_CHECK_STEPS_ROUTE } from '../../../common/constants';

jest.mock('../../state/api/journey', () => ({
  fetchJourneySteps: jest.fn(),
}));

// We must mock all other API calls because we're using the real store
// in this test. Using the real store causes actions and effects to actually
// run, which could trigger API calls.
jest.mock('../../state/api/utils.ts', () => ({
  apiService: { get: jest.fn().mockResolvedValue([]) },
}));

const getRelevantPageHistory = () => {
  const history = createMemoryHistory();
  const checkStepsHistoryFrame = SYNTHETIC_CHECK_STEPS_ROUTE.replace(
    /:checkGroupId/g,
    'my-check-group-id'
  );

  history.push(checkStepsHistoryFrame);

  return history;
};

describe('SyntheticsCheckStepsPageHeader component', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns the monitor name', async () => {
    (fetchJourneySteps as jest.Mock).mockResolvedValueOnce({
      checkGroup: 'my-check-group-id',
      details: {
        journey: {
          monitor: { name: 'test-name' },
        },
      },
    });

    const { findByText } = render(<SyntheticsCheckStepsPageHeader />, {
      history: getRelevantPageHistory(),
      path: SYNTHETIC_CHECK_STEPS_ROUTE,
      useRealStore: true,
    });

    expect(await findByText('test-name'));
  });

  it('returns the monitor ID when no name is provided', async () => {
    (fetchJourneySteps as jest.Mock).mockResolvedValueOnce({
      checkGroup: 'my-check-group-id',
      details: {
        journey: {
          monitor: { name: 'test-id' },
        },
      },
    });

    const { findByText } = render(<SyntheticsCheckStepsPageHeader />, {
      history: getRelevantPageHistory(),
      path: SYNTHETIC_CHECK_STEPS_ROUTE,
      useRealStore: true,
    });
    expect(await findByText('test-id'));
  });
});

describe('SyntheticsCheckStepsPageRightSideItem component', () => {
  it('returns null when there are no details', () => {
    (fetchJourneySteps as jest.Mock).mockResolvedValueOnce(null);
    const { container } = render(<SyntheticsCheckStepsPageRightSideItem />, {
      history: getRelevantPageHistory(),
      path: SYNTHETIC_CHECK_STEPS_ROUTE,
      useRealStore: true,
    });
    expect(container.firstChild).toBeNull();
  });

  it('renders navigation element if details exist', async () => {
    (fetchJourneySteps as jest.Mock).mockResolvedValueOnce({
      checkGroup: 'my-check-group-id',
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

    const { findByText } = render(<SyntheticsCheckStepsPageRightSideItem />, {
      history: getRelevantPageHistory(),
      path: SYNTHETIC_CHECK_STEPS_ROUTE,
      useRealStore: true,
    });
    expect(await findByText('Nov 4, 2003 12:00:00 AM'));
    expect(await findByText('Next check'));
    expect(await findByText('Previous check'));
  });
});

describe('SyntheticsCheckSteps component', () => {
  it('renders empty steps list', async () => {
    (fetchJourneySteps as jest.Mock).mockResolvedValueOnce({
      checkGroup: 'my-check-group-id',
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

    const { findByText } = render(<SyntheticsCheckSteps />, {
      history: getRelevantPageHistory(),
      path: SYNTHETIC_CHECK_STEPS_ROUTE,
      useRealStore: true,
    });
    expect(await findByText('0 Steps - all failed or skipped'));
    expect(await findByText('This journey did not contain any steps.'));
  });

  it('renders steps', async () => {
    (fetchJourneySteps as jest.Mock).mockResolvedValueOnce({
      checkGroup: 'my-check-group-id',
      details: {
        timestamp: '20031104',
        journey: {
          monitor: {
            name: 'test-name',
            id: 'test-id',
          },
        },
      },
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

    const { findByText } = render(<SyntheticsCheckSteps />, {
      history: getRelevantPageHistory(),
      path: SYNTHETIC_CHECK_STEPS_ROUTE,
      useRealStore: true,
    });
    expect(await findByText('1 Steps - all failed or skipped'));
  });
});
