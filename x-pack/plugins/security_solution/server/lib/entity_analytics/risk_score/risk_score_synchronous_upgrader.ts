/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

export class RiskScoreSynchronousUpgrader {
  private constructor() {} // private constructor to prevent instantiation
  private static upgradesConducted: Record<string, Promise<void>> = {};

  /**
   * An async function that ensures that {@link upgradeFunction}s are executed synchronously,
   * no matter how many times they are called.
   *
   * @returns A promise returned by the {@link upgradeFunction} of a previous invocation of
   * this {@link upgrade} function, or the promise returned by the {@link upgradeFunction} if one hasn't been provided yet.
   */
  static async upgrade(namespace: string, logger: Logger, upgradeFunction: () => Promise<void>) {
    if (!RiskScoreSynchronousUpgrader.upgradesConducted[namespace]) {
      RiskScoreSynchronousUpgrader.upgradesConducted[namespace] = upgradeFunction().catch((err) => {
        logger.error(`Error upgrading risk engine resources. ${err.message}`);
        delete RiskScoreSynchronousUpgrader.upgradesConducted[namespace];
        throw err;
      });
    }
    return RiskScoreSynchronousUpgrader.upgradesConducted[namespace];
  }
}
