/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerFacade } from '..';
import { Action } from './action';
import { ActionResult } from './action_result';

describe('Action', () => {
  const id = 'notifications-test';
  const unimplementedName = 'Unimplemented';
  const throwsErrorName = 'Throws Error';
  const passThruName = 'Test Action';

  let server: ServerFacade = {
    log: jest.fn(),
    config: jest.fn(),
    plugins: { xpack_main: { info: { license: { isNotBasic: () => true } } } },
  };

  beforeEach(() => {
    server = {
      log: jest.fn(),
      config: jest.fn(),
      plugins: { xpack_main: { info: { license: { isNotBasic: () => true } } } },
    };
  });

  const action = new Action({ server, id, name: unimplementedName });
  const notification = {
    fake: true,
  };

  test('id and name to be from constructor', () => {
    expect(action.getId()).toBe(id);
    expect(action.getName()).toBe(unimplementedName);
  });

  test('getMissingFields returns an empty array', () => {
    expect(action.getMissingFields({})).toEqual([]);
  });

  test('doPerformHealthChecks throws error indicating that it is not implemented', async () => {
    await expect(action.doPerformHealthCheck()).rejects.toThrow(
      `[doPerformHealthCheck] is not implemented for '${unimplementedName}' action.`
    );
  });

  describe('performHealthChecks', () => {
    class ThrowsErrorHealthCheckAction extends Action {
      constructor() {
        super({ server, id, name: throwsErrorName });
      }

      public async doPerformHealthCheck(): Promise<ActionResult> {
        throw new Error('TEST - expected');
      }
    }

    /* tslint:disable:max-classes-per-file*/
    class PassThruHealthCheckAction extends Action {
      private result: any;
      constructor(result: any) {
        super({ server, id, name: passThruName });
        this.result = result;
      }

      public async doPerformHealthCheck() {
        return this.result;
      }
    }

    test('runs against unimplemented doPerformHealthChecks', async () => {
      const result = await action.performHealthCheck();

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage()).toMatch(
        new RegExp(
          `^Unable to perform '${unimplementedName}' health check: \\[doPerformHealthCheck\\] is not.*`
        )
      );
    });

    test('runs against failing doPerformHealthChecks', async () => {
      const failAction = new ThrowsErrorHealthCheckAction();
      const result = await failAction.performHealthCheck();

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage()).toMatch(
        new RegExp(`^Unable to perform '${throwsErrorName}' health check: TEST - expected`)
      );
    });

    test('runs against succeeding result', async () => {
      const expectedResult = new ActionResult({ message: 'Blah', response: { ok: true } });
      const succeedsAction = new PassThruHealthCheckAction(expectedResult);
      const result = await succeedsAction.performHealthCheck();

      expect(result).toBe(expectedResult);
    });
  });

  test('doPerformAction throws error indicating that it is not implemented', async () => {
    await expect(action.doPerformAction(notification)).rejects.toThrow(
      `[doPerformAction] is not implemented for '${unimplementedName}' action: {"fake":true}`
    );
  });

  describe('isLicenseValid', () => {
    test('returns false is license is not valid', () => {
      const unlicensedServer = {
        plugins: {
          xpack_main: {
            info: {
              license: {
                isNotBasic: () => false,
              },
            },
          },
        },
      };
      server.plugins = unlicensedServer.plugins;
      const unlicensedAction = new Action({
        server,
        id,
        name: unimplementedName,
      });

      expect(unlicensedAction.isLicenseValid()).toBe(false);
    });

    test('returns true is license is not valid', () => {
      const licensedAction = new Action({ server, id, name: unimplementedName });

      expect(licensedAction.isLicenseValid()).toBe(true);
    });
  });

  describe('performAction', () => {
    class ThrowsErrorAction extends Action {
      constructor() {
        super({ server, id, name: throwsErrorName });
      }

      public async doPerformAction(): Promise<ActionResult> {
        throw new Error('TEST - expected');
      }
    }

    class PassThruAction extends Action {
      private result: any;
      constructor(result: any) {
        super({ server, id, name: passThruName });
        this.result = result;
      }

      public async doPerformAction() {
        return this.result;
      }
    }

    describe('fails license check', () => {
      // handles the case when xpack_main definitions change
      test('because of bad reference', async () => {
        // server is an empty object, so a reference fails early in the chain (mostly a way to give devs a way to find this error)
        const result = await action.performAction(notification);

        expect(result instanceof ActionResult).toBe(true);
        expect(result.isOk()).toBe(false);
      });

      test('because license is invalid or basic', async () => {
        server.plugins = {
          xpack_main: {
            info: {
              license: {
                isNotBasic: () => false,
              },
            },
          },
        };
        const unlicensedAction = new Action({
          server,
          id,
          name: unimplementedName,
        });
        const result = await unlicensedAction.performAction(notification);

        expect(result instanceof ActionResult).toBe(true);
        expect(result.isOk()).toBe(false);
        expect(result.getMessage()).toMatch(
          `Unable to perform '${unimplementedName}' action: ` +
            `The current license does not allow '${unimplementedName}' action.`
        );
      });
    });

    test('runs against unimplemented doPerformAction', async () => {
      const licensedAction = new Action({ server, id, name: unimplementedName });
      const result = await licensedAction.performAction(notification);

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage()).toMatch(
        new RegExp(
          `^Unable to perform '${unimplementedName}' action: \\[doPerformAction\\] is not.*`
        )
      );
    });

    test('runs against failing doPerformAction', async () => {
      const failAction = new ThrowsErrorAction();
      const result = await failAction.performAction(notification);

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage()).toMatch(
        new RegExp(`^Unable to perform '${throwsErrorName}' action: TEST - expected`)
      );
    });

    test('runs against succeeding result', async () => {
      const expectedResult = new ActionResult({ message: 'Blah', response: { ok: true } });
      const succeedsAction = new PassThruAction(expectedResult);
      const result = await succeedsAction.performAction(notification);

      expect(result).toBe(expectedResult);
    });
  });
});
