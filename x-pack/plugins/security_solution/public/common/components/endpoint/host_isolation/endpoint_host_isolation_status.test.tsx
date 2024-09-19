/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EndpointHostIsolationStatus,
  EndpointHostIsolationStatusProps,
} from './endpoint_host_isolation_status';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../mock/endpoint';

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
            pendingUnIsolate: 0,
            pendingIsolate: 0,
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
    ['Isolating', { pendingIsolate: 2 }],
    ['Releasing', { pendingUnIsolate: 2 }],
    ['4 actions pending', { isIsolated: true, pendingUnIsolate: 2, pendingIsolate: 2 }],
  ])('should show %s}', (expectedLabel, componentProps) => {
    const { getByTestId } = render(componentProps);
    expect(getByTestId('test').textContent).toBe(expectedLabel);
    // Validate that the text color is set to `subdued`
    expect(getByTestId('test-pending').classList.contains('euiTextColor--subdued')).toBe(true);
  });

  describe('and the disableIsolationUIPendingStatuses experimental feature flag is true', () => {
    beforeEach(() => {
      appContext.setExperimentalFlag({ disableIsolationUIPendingStatuses: true });
    });

    it('should render `null` if not isolated', () => {
      const renderResult = render({ pendingIsolate: 10, pendingUnIsolate: 20 });
      expect(renderResult.container.textContent).toBe('');
    });

    it('should show `Isolated` when no pending actions and isolated', () => {
      const { getByTestId } = render({
        isIsolated: true,
        pendingIsolate: 10,
        pendingUnIsolate: 20,
      });
      expect(getByTestId('test').textContent).toBe('Isolated');
    });
  });
});
