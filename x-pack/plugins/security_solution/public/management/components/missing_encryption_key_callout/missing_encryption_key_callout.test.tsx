/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTS_SETUP_API_ROUTES } from '@kbn/fleet-plugin/common';
import { act, fireEvent } from '@testing-library/react';
import React from 'react';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { policyListApiPathHandlers } from '../../pages/policy/store/test_mock_utils';
import { MissingEncryptionKeyCallout } from './missing_encryption_key_callout';

describe('Missing encryption key callout', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let asyncActions: Promise<unknown> = Promise.resolve();
  const sleep = (ms = 100) => new Promise((wakeup) => setTimeout(wakeup, ms));

  const policyListApiHandlers = policyListApiPathHandlers();

  const apiReturnsEncryptionKeyIsSet = (encryptionKeySet: boolean) => {
    mockedContext.coreStart.http.get.mockImplementation((...args) => {
      const [path] = args;
      if (typeof path === 'string') {
        // GET datasouce
        if (path === AGENTS_SETUP_API_ROUTES.INFO_PATTERN) {
          asyncActions = asyncActions.then<unknown>(async (): Promise<unknown> => sleep());
          return Promise.resolve({
            isReady: true,
            missing_requirements: [],
            missing_optional_features: encryptionKeySet
              ? []
              : ['encrypted_saved_object_encryption_key_required'],
          });
        }

        // Get package data
        // Used in tests that route back to the list
        if (policyListApiHandlers[path]) {
          asyncActions = asyncActions.then(async () => sleep());
          return Promise.resolve(policyListApiHandlers[path]());
        }
      }

      return Promise.reject(new Error(`unknown API call (not MOCKED): ${path}`));
    });
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = () => (renderResult = mockedContext.render(<MissingEncryptionKeyCallout />));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be visible when encryption key not set', async () => {
    apiReturnsEncryptionKeyIsSet(false);
    render();
    await asyncActions;
    const callout = renderResult.queryByTestId('missingEncryptionKeyCallout');
    expect(callout).toBeTruthy();
  });

  it('should not be visible when encryption key is set', async () => {
    apiReturnsEncryptionKeyIsSet(true);
    render();
    await asyncActions;
    const callout = renderResult.queryByTestId('missingEncryptionKeyCallout');
    expect(callout).toBeFalsy();
  });

  it('should be able to dismiss when visible', async () => {
    apiReturnsEncryptionKeyIsSet(false);
    render();
    await asyncActions;
    let callout = renderResult.queryByTestId('missingEncryptionKeyCallout');
    expect(callout).toBeTruthy();

    act(() => {
      fireEvent.click(renderResult.getByTestId('dismissEncryptionKeyCallout'));
    });

    callout = renderResult.queryByTestId('missingEncryptionKeyCallout');
    expect(callout).toBeFalsy();
  });
});
