/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { runRule } from './run_rule';

jest.mock('./rule_api', () => ({
  runSoon: jest.fn(),
}));
const mockRunSoon = jest.requireMock('./rule_api').runSoon;

describe('runRule', () => {
  const mockCoreSetup = coreMock.createSetup();
  const toasts = mockCoreSetup.notifications.toasts;
  const http = mockCoreSetup.http;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('displays warning toast when runSoon() returns a message', async () => {
    mockRunSoon.mockReturnValue(Promise.resolve('warning'));
    await runRule(http, toasts, '1');
    expect(mockRunSoon).toHaveBeenCalled();
    expect(toasts.addWarning).toHaveBeenCalledWith({ title: 'warning' });
  });

  test('displays success toast when runSoon() returns nothing', async () => {
    mockRunSoon.mockReturnValue(Promise.resolve());
    await runRule(http, toasts, '1');
    expect(mockRunSoon).toHaveBeenCalled();
    expect(toasts.addSuccess).toHaveBeenCalledWith({ title: 'Your rule is scheduled to run' });
  });

  test('displays error toast when runSoon() throws an error', async () => {
    mockRunSoon.mockReturnValue(Promise.reject('error'));
    await runRule(http, toasts, '1');
    expect(mockRunSoon).toHaveBeenCalled();
    expect(toasts.addError).toHaveBeenCalledWith('error', {
      title: 'Unable to schedule your rule to run',
    });
  });
});
