/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Combine all shared mock values/actions into a single obj
 *
 * NOTE: These variable names MUST start with 'mock*' in order for
 * Jest to accept its use within a jest.mock()
 */
import { mockKibanaValues } from './kibana_logic.mock';
import { mockLicensingValues } from './licensing_logic.mock';
import { mockHttpValues } from './http_logic.mock';
import { mockTelemetryActions } from './telemetry_logic.mock';
import { mockFlashMessagesValues, mockFlashMessagesActions } from './flash_messages_logic.mock';

export const mockAllValues = {
  ...mockKibanaValues,
  ...mockLicensingValues,
  ...mockHttpValues,
  ...mockFlashMessagesValues,
};
export const mockAllActions = {
  ...mockTelemetryActions,
  ...mockFlashMessagesActions,
};

/**
 * Import this file directly to mock useValues with a set of default values for all shared logic files.
 * Example usage:
 *
 * import '../../../__mocks__/kea'; // Must come before kea's import, adjust relative path as needed
 */
jest.mock('kea', () => ({
  ...(jest.requireActual('kea') as object),
  useValues: jest.fn(() => ({ ...mockAllValues })),
  useActions: jest.fn(() => ({ ...mockAllActions })),
}));

/**
 * Call this function to override a specific set of Kea values while retaining all other defaults
 * Example usage within a component test:
 *
 * import '../../../__mocks__/kea';
 * import { setMockValues } from ''../../../__mocks__';
 *
 * it('some test', () => {
 *   setMockValues({ someValue: 'hello' });
 * });
 */
import { useValues, useActions } from 'kea';

export const setMockValues = (values: object) => {
  (useValues as jest.Mock).mockImplementation(() => ({ ...mockAllValues, ...values }));
};
export const setMockActions = (actions: object) => {
  (useActions as jest.Mock).mockImplementation(() => ({ ...mockAllActions, ...actions }));
};
