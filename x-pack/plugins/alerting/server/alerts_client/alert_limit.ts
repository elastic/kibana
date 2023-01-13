/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface IAlertLimitServices {
  hasReachedAlertLimit(): void;
  getAlertLimitValue(): void;
  setAlertLimitReached(reached: boolean, externalReport?: boolean): void;
  checkLimitUsage(): void;
}

interface AlertLimitServicesParams {
  maxAlerts: number;
}

export class AlertLimitServices implements IAlertLimitServices {
  private limitRequested: boolean = false;
  private limitReached: boolean = false;
  private limitReported: boolean = false;

  constructor(private readonly options: AlertLimitServicesParams) {}

  public hasReachedAlertLimit() {
    return this.limitReached;
  }

  public getAlertLimitValue() {
    this.limitRequested = true;
    return this.options.maxAlerts;
  }

  /**
   * @param reached - Whether the limit was reached
   * @param externalReport - Whether this was reported by a rule executor (external) or the AlertsClient (internal)
   */
  public setAlertLimitReached(reached: boolean, externalReport: boolean = false) {
    this.limitReported = externalReport;
    this.limitReached = reached;
  }

  public checkLimitUsage() {
    // If the limit value has been requested but never reported back whether the limit was reached, throw an error
    if (this.limitRequested && !this.limitReported) {
      throw new Error(
        `Rule has not reported whether alert limit has been reached after requesting limit value!`
      );
    }
  }
}
