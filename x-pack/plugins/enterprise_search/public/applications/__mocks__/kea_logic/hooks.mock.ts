/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Combine all shared mock values/actions into a single obj
 *
 * NOTE: These variable names MUST start with 'mock*' in order for
 * Jest to accept its use within a jest.mock()
 */
import { mockFlashMessagesValues, mockFlashMessagesActions } from './flash_messages_logic.mock';
import { mockHttpValues } from './http_logic.mock';
import { mockKibanaValues } from './kibana_logic.mock';
import { mockLicensingValues } from './licensing_logic.mock';
import { mockTelemetryActions } from './telemetry_logic.mock';

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
 * import '../../../__mocks__/kea_logic'; // Must come before kea's import, adjust relative path as needed
 */
jest.mock('kea', () => ({
  ...(jest.requireActual('kea') as object),
  useActions: jest.fn(() => ({ ...mockAllActions })),
  useValues: jest.fn(() => ({ ...mockAllValues })),
}));

/**
 * React component helpers
 *
 * Call this function to override a specific set of Kea values while retaining all other defaults
 *
 * Example usage:
 *
 * import { setMockValues } from '../../../__mocks__/kea_logic';
 * import { SomeComponent } from './';
 *
 * it('some test', () => {
 *   setMockValues({ someValue: 'hello' });
 *   shallow(<SomeComponent />);
 * });
 */
import { useValues, useActions } from 'kea';

export const setMockValues = (values: object) => {
  (useValues as jest.Mock).mockImplementation(() => ({ ...mockAllValues, ...values }));
};
export const setMockActions = (actions: object) => {
  (useActions as jest.Mock).mockImplementation(() => ({ ...mockAllActions, ...actions }));
};
