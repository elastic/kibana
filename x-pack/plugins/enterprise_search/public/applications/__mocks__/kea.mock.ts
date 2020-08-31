/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('kea', () => ({
  ...(jest.requireActual('kea') as object),
  useValues: jest.fn(() => ({})),
  useActions: jest.fn(() => ({})),
}));

/**
 * Example usage within a component test:
 *
 * import '../../../__mocks__/kea'; // Must come before kea's import, adjust relative path as needed
 *
 * import { useActions, useValues } from 'kea';
 *
 * it('some test', () => {
 *   (useValues as jest.Mock).mockImplementationOnce(() => ({ someValue: 'hello' }));
 *   (useActions as jest.Mock).mockImplementationOnce(() => ({ someAction: () => 'world' }));
 * });
 */
