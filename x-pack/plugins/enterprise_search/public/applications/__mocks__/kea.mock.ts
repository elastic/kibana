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
 *   mount({ someValue: 'hello' }, { someProp: 'world' });
 *   unmount();
 * });
 */
import { resetContext, LogicWrapper } from 'kea';
import { merge } from 'lodash';

type LogicFile = LogicWrapper<any>;

export class LogicMounter {
  private logicFile: LogicFile;
  private unmountFn!: Function;

  constructor(logicFile: LogicFile) {
    this.logicFile = logicFile;
  }

  // Reset context with optional default value overrides
  public resetContext = (values?: object, props?: object) => {
    if (!values || !Object.keys(values).length) {
      resetContext({});
    } else {
      const defaults: object = this.createDefaultValuesObject(values, props);
      resetContext({ defaults });
    }
  };

  /**
   * Based on the values passed into mount, turn them into properly nested objects that can
   * be passed to kea's resetContext in order to set default values":
   *
   * ex.
   *
   * input:
   *
   * values: {
   *   schema: { foo: "text" },
   *   engineName: "engine1"
   * }
   *
   * output:
   *
   * {
   *   enterprise_search: {
   *     app_search: {
   *       schema_logic: {
   *         schema: { foo: "text" }
   *       },
   *       engine_logic: {
   *         engineName: "engine1"
   *       }
   *     }
   *   }
   * }
   */
  private createDefaultValuesObject = (values: object, props?: object) => {
    let { path, key } = this.logicFile.inputs[0];

    // For keyed logic files, both key and path should be functions
    if (this.logicFile._isKeaWithKey) {
      key = key(props);
      path = path(key);
    }

    // TODO Deal with this if and when we get there.
    if (this.logicFile.inputs[0].connect?.values.length > 2) {
      throw Error(
        "This connected logic has more than 2 values in 'connect', implement handler logic for this in kea.mock.ts"
      );
    }

    // If a logic includes values from another logic via the "connect" property, we need to make sure they're nested
    // correctly under the correct path.
    //
    // For example, if the current logic under test is SchemaLogic connects values from EngineLogic also, then we need
    // to make sure that values from SchemaLogic get nested under enterprise_search.app_search.schema_logic, and values
    // from EngineLogic get nested under enterprise_search.app_search.engine_logic
    if (this.logicFile.inputs[0].connect?.values[0]) {
      const connectedPath = this.logicFile.inputs[0].connect.values[0].inputs[0].path;
      const connectedValueKeys = this.logicFile.inputs[0].connect.values[1];

      const primaryValues: Record<string, object> = {};
      const connectedValues: Record<string, object> = {};

      Object.entries(values).forEach(([k, v]) => {
        if (connectedValueKeys.includes(k)) {
          connectedValues[k] = v;
        } else {
          primaryValues[k] = v;
        }
      });

      return merge(createDefaults(path, values), createDefaults(connectedPath, connectedValues));
    } else {
      return createDefaults(path, values);
    }
  };

  // Automatically reset context & mount the logic file
  public mount = (values?: object, props?: object) => {
    this.resetContext(values, props);

    const logicWithProps = this.logicFile.build(props);
    this.unmountFn = logicWithProps.mount();

    return logicWithProps;
    // NOTE: Unlike kea's mount(), this returns the current
    // built logic instance with props, NOT the unmount fn
  };

  // Custom "jest-like" assertions
  //   ex.
  //      expectAction(() => {
  //        SomeLogic.actions.dataInitialized();
  //      }).toChangeState({
  //        from: { dataLoading: true },
  //        to: { dataLoading: false },
  //      });
  //
  // For keyed logic:
  //
  //   ex.
  //      expectAction((logic) => {
  //        logic.actions.dataInitialized();
  //      }, PROPS).toChangeState({
  //        from: { dataLoading: true },
  //        to: { dataLoading: false },
  //      });
  //

  public expectAction = (action: (logic: LogicFile) => void, props: object = {}) => {
    return {
      // Mount state with "from" values and test that the specified "to" values are present in
      // the updated state, and that no other values have changed.
      toChangeState: ({ from, to }: { from: object; to: object }, ignoreFields: string[] = []) => {
        const logic = this.mount(from, props);
        const originalValues = {
          ...logic.values,
        };
        action(logic);
        expect(logic.values).toEqual({
          ...originalValues,
          ...to,
          ...ignoreFields.reduce((acc: Record<string, object>, field: string) => {
            acc[field] = expect.anything();
            return acc;
          }, {}),
        });
      },
    };
  };

  // Also add unmount as a class method that can be destructured on init without becoming stale later
  public unmount = () => {
    this.unmountFn();
  };

  /**
   * Some tests (e.g. async tests, tests that expect thrown errors) need to access
   * listener functions directly instead of calling `SomeLogic.actions.someListener`,
   * due to how Kea invokes/wraps action fns by design.
   *
   * Example usage:
   *
   * const { mount, getListeners } = new LogicMounter(SomeLogic);
   *
   * it('some test', async () => {
   *   mount();
   *   const { someListener } = getListeners({ values: { someMockValue: false } });
   *
   *   const mockBreakpoint = jest.fn();
   *   await someListener({ someMockArgument: true }, mockBreakpoint);
   * });
   */
  public getListeners = (listenersArgs: object = {}) => {
    const { listeners } = this.logicFile.inputs[0];

    return typeof listeners === 'function'
      ? listeners(listenersArgs) // e.g., listeners({ values, actions, props }) => ({ ... })
      : listeners; // handles simpler logic files that just define listeners: { ... }
  };
}

// Generate the correct nested defaults obj based on the file path
// example path: ['x', 'y', 'z']
// example defaults: { x: { y: { z: values } } }
const createDefaults = (path: string[], values: object) => {
  return path.reduceRight((value: object, name: string) => ({ [name]: value }), values);
};
