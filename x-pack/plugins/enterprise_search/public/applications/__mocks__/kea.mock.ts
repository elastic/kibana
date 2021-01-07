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
 * React component helpers
 *
 * Call this function to override a specific set of Kea values while retaining all other defaults
 *
 * Example usage:
 *
 * import { setMockValues } from '../../../__mocks__/kea.mock';
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

/**
 * Kea logic helpers
 *
 * Call this function to mount a logic file and optionally override default values.
 * Automatically DRYs out a lot of cruft for us, such as resetting context, creating the
 * nested defaults path obj (see https://kea.js.org/docs/api/context#resetcontext), and
 * returning an unmount function
 *
 * Example usage:
 *
 * import { LogicMounter } from '../../../__mocks__/kea.mock';
 * import { SomeLogic } from './';
 *
 * const { mount, unmount } = new LogicMounter(SomeLogic);
 *
 * it('some test', () => {
 *   mount({ someValue: 'hello' });
 *   unmount();
 * });
 */
import { resetContext, Logic, LogicInput } from 'kea';

interface LogicFile {
  inputs: Array<LogicInput<Logic>>;
  mount(): Function;
}
export class LogicMounter {
  private logicFile: LogicFile;
  private unmountFn!: Function;

  constructor(logicFile: LogicFile) {
    this.logicFile = logicFile;
  }

  // Reset context with optional default value overrides
  public resetContext = (values?: object) => {
    if (!values) {
      resetContext({});
    } else {
      const path = this.logicFile.inputs[0].path as string[]; // example: ['x', 'y', 'z']
      const defaults = path.reduceRight((value: object, key: string) => ({ [key]: value }), values); // example: { x: { y: { z: values } } }
      resetContext({ defaults });
    }
  };

  // Automatically reset context & mount the logic file
  public mount = (values?: object) => {
    this.resetContext(values);
    const unmount = this.logicFile.mount();
    this.unmountFn = unmount;
    return unmount; // Keep Kea behavior of returning an unmount fn from mount
  };

  // Also add unmount as a class method that can be destructured on init without becoming stale later
  public unmount = () => {
    this.unmountFn();
  };
}
