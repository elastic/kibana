/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EndpointHostIsolationStatusProps } from './endpoint_host_isolation_status';
import { EndpointHostIsolationStatus } from './endpoint_host_isolation_status';
import type { AppContextTestRender } from '../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../mock/endpoint';

describe('when using the EndpointHostIsolationStatus component', () => {
  let render: (
    renderProps?: Partial<EndpointHostIsolationStatusProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let appContext: AppContextTestRender;

  beforeEach(() => {
    appContext = createAppRootMockRenderer();

    render = (renderProps = {}) =>
      appContext.render(
        <EndpointHostIsolationStatus
          {...{
            'data-test-subj': 'test',
            isIsolated: false,
            pendingActions: {},
            ...renderProps,
          }}
        />
      );
  });

  it('should render `null` if not isolated and nothing is pending', () => {
    const renderResult = render();
    expect(renderResult.container.textContent).toBe('');
  });

  it('should show `Isolated` when no pending actions and isolated', () => {
    const { getByTestId } = render({ isIsolated: true });
    expect(getByTestId('test').textContent).toBe('Isolated');
  });

  it.each([
    [
      'Isolating',
      {
        pendingActions: {
          pendingIsolate: 1,
        },
      },
    ],
    [
      'Releasing',
      {
        pendingActions: {
          pendingUnIsolate: 1,
        },
      },
    ],
    [
      // Because they are both of the same type and there are no other types,
      // the status should be `isolating`
      'Isolating',
      {
        pendingActions: {
          pendingIsolate: 2,
        },
      },
    ],
    [
      // Because they are both of the same type and there are no other types,
      // the status should be `Releasing`
      'Releasing',
      {
        pendingActions: {
          pendingUnIsolate: 2,
        },
      },
    ],
    [
      '10 actions pending',
      {
        isIsolated: true,
        pendingActions: {
          pendingIsolate: 2,
          pendingUnIsolate: 2,
          pendingKillProcess: 2,
          pendingSuspendProcess: 2,
          pendingRunningProcesses: 2,
        },
      },
    ],
    [
      '1 action pending',
      {
        isIsolated: true,
        pendingActions: {
          pendingKillProcess: 1,
        },
      },
    ],
  ])('should show %s}', (expectedLabel, componentProps) => {
    const { getByTestId } = render(componentProps);
    expect(getByTestId('test').textContent).toBe(expectedLabel);
    // Validate that the text color is set to `subdued`
    expect(getByTestId('test-pending').classList.toString().includes('subdued')).toBe(true);
  });

  describe('and the disableIsolationUIPendingStatuses experimental feature flag is true', () => {
    beforeEach(() => {
      appContext.setExperimentalFlag({ disableIsolationUIPendingStatuses: true });
    });

    it('should render `null` if not isolated', () => {
      const renderResult = render({
        pendingActions: {
          pendingIsolate: 10,
          pendingUnIsolate: 20,
        },
      });
      expect(renderResult.container.textContent).toBe('');
    });

    it('should show `Isolated` when no pending actions and isolated', () => {
      const { getByTestId } = render({
        isIsolated: true,
        pendingActions: {
          pendingIsolate: 10,
          pendingUnIsolate: 20,
        },
      });
      expect(getByTestId('test').textContent).toBe('Isolated');
    });
  });
});
