/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreSynchronousUpgrader } from './risk_score_synchronous_upgrader';
import type { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

const resetSynchronousUpgrader = () => {
  // @ts-ignore accessing the private member in order to reset the upgrades without increasing its visibility
  RiskScoreSynchronousUpgrader.upgradesConducted = {};
};

const sleep = (ms: number) => (valueToResolve: unknown) =>
  new Promise((resolve) => setTimeout(() => resolve(valueToResolve), ms));

describe('RiskScoreSynchronousUpgrader', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    resetSynchronousUpgrader();
  });

  it(`only upgrades a single time for a single namespace, no matter how many times it's called`, () => {
    const stub = jest.fn();

    RiskScoreSynchronousUpgrader.upgrade('default', logger, () => {
      stub();
      return Promise.resolve(undefined);
    });
    // call it again, although this time it should not be invoked
    RiskScoreSynchronousUpgrader.upgrade('default', logger, () => {
      stub();
      return Promise.resolve(undefined);
    });

    expect(stub).toBeCalledTimes(1);
  });

  it(`will upgrade a single time for each namespace`, () => {
    const stub = jest.fn();

    RiskScoreSynchronousUpgrader.upgrade('namespace1', logger, () => {
      stub();
      return Promise.resolve(undefined);
    });

    RiskScoreSynchronousUpgrader.upgrade('namespace2', logger, () => {
      stub();
      return Promise.resolve(undefined);
    });

    expect(stub).toBeCalledTimes(2);
  });

  it(`will conduct the upgrade for the first execution, not subsequent ones, no matter the execution delay of the first`, async () => {
    const delayedStub = jest.fn();
    const immediateStub = jest.fn();

    const delayedUpgrade = RiskScoreSynchronousUpgrader.upgrade('default', logger, () => {
      return Promise.resolve(undefined)
        .then(sleep(1000))
        .then(() => delayedStub());
    });

    const immediateUpgrade = RiskScoreSynchronousUpgrader.upgrade('default', logger, () => {
      immediateStub();
      return Promise.resolve(undefined);
    });

    await Promise.all([delayedUpgrade, immediateUpgrade]);

    // although the `immediateUpgrade` resolves immediately, it will never be invoked, because the `delayedUpgrade` is called first.
    expect(delayedStub).toBeCalledTimes(1);
    expect(immediateStub).toBeCalledTimes(0);
  });

  it(`handles errors`, async () => {
    const stubInErrorPath = jest.fn();
    const stubInSuccessfulPath = jest.fn();

    const processUpgradeHavingErrors = async () => {
      const failedUpgrade = RiskScoreSynchronousUpgrader.upgrade('default', logger, () => {
        return Promise.resolve(undefined)
          .then(sleep(1000))
          .then(() => stubInErrorPath())
          .then(() => {
            throw new Error('Error in upgrading');
          });
      });

      const normalUpgrade = RiskScoreSynchronousUpgrader.upgrade('default', logger, () => {
        stubInErrorPath();
        return Promise.resolve(undefined);
      });

      await Promise.all([failedUpgrade, normalUpgrade]);
    };

    await expect(processUpgradeHavingErrors).rejects.toThrow('Error in upgrading');

    // the stubbed method should only be called once, as the second upgrade was called while still waiting for the first to resolve
    expect(stubInErrorPath).toBeCalledTimes(1);

    // however, now that all promises have resolved, we should be able to successfully upgrade.
    await RiskScoreSynchronousUpgrader.upgrade('default', logger, () => {
      stubInSuccessfulPath();
      return Promise.resolve(undefined);
    });

    expect(stubInSuccessfulPath).toBeCalledTimes(1);
  });
});
