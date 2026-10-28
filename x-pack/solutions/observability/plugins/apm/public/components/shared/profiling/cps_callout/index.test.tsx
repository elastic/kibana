/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { ICPSManager } from '@kbn/cps-utils';
import { PROFILING_CPS_CALLOUT_DISMISSED_STORAGE_KEY, ProfilingCpsCallout } from '.';

// The parts of the CPS manager the callout reads, through `useIsCpsMultiProject`
type MockCpsManager = Pick<ICPSManager, 'whenReady' | 'hasLinkedProjects'>;

const mockCpsManager$ = new BehaviorSubject<MockCpsManager | undefined>(undefined);

jest.mock('../../../../plugin', () => ({
  get apmCpsManager$() {
    return mockCpsManager$;
  },
  getApmCpsManager: () => mockCpsManager$.getValue(),
}));

const CALLOUT_TEST_SUBJ = 'apmProfilingCpsCallout';

const createCpsManager = ({
  hasLinkedProjects,
  isReady = true,
}: {
  hasLinkedProjects: boolean;
  isReady?: boolean;
}): MockCpsManager => ({
  whenReady: () => (isReady ? Promise.resolve() : new Promise(() => {})),
  hasLinkedProjects: () => hasLinkedProjects,
});

// Lets the `whenReady()` promise the CPS hook waits on settle
const flushCpsReadiness = () => act(() => Promise.resolve());

describe('ProfilingCpsCallout', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockCpsManager$.next(undefined);
  });

  it('is hidden when no CPS manager is published, i.e. outside CPS or with the APM CPS flag off', async () => {
    render(<ProfilingCpsCallout />);
    await flushCpsReadiness();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('is hidden while the CPS manager is not ready', async () => {
    mockCpsManager$.next(createCpsManager({ hasLinkedProjects: false, isReady: false }));

    render(<ProfilingCpsCallout />);
    await flushCpsReadiness();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('is hidden when the project has no linked projects', async () => {
    mockCpsManager$.next(createCpsManager({ hasLinkedProjects: false }));

    render(<ProfilingCpsCallout />);
    await flushCpsReadiness();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('is shown when the project has linked projects', async () => {
    mockCpsManager$.next(createCpsManager({ hasLinkedProjects: true }));

    render(<ProfilingCpsCallout />);
    await flushCpsReadiness();

    expect(screen.getByTestId(CALLOUT_TEST_SUBJ)).toBeInTheDocument();
  });

  it('is shown when a CPS manager with linked projects is published after mount', async () => {
    render(<ProfilingCpsCallout />);
    await flushCpsReadiness();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();

    act(() => {
      mockCpsManager$.next(createCpsManager({ hasLinkedProjects: true }));
    });
    await flushCpsReadiness();

    expect(screen.getByTestId(CALLOUT_TEST_SUBJ)).toBeInTheDocument();
  });

  it('is hidden and remembers the dismissal when dismissed', async () => {
    mockCpsManager$.next(createCpsManager({ hasLinkedProjects: true }));

    render(<ProfilingCpsCallout />);
    await flushCpsReadiness();
    fireEvent.click(screen.getByTestId('apmProfilingCpsCalloutDismissButton'));

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(PROFILING_CPS_CALLOUT_DISMISSED_STORAGE_KEY)).toBe('true');
  });

  it('is hidden when it was dismissed before', async () => {
    window.localStorage.setItem(PROFILING_CPS_CALLOUT_DISMISSED_STORAGE_KEY, 'true');
    mockCpsManager$.next(createCpsManager({ hasLinkedProjects: true }));

    render(<ProfilingCpsCallout />);
    await flushCpsReadiness();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });
});
