/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, Logger } from '../../../../../../core/server';

export interface TelemetryEventsSenderContract {
  logger: Logger;
}

export class TelemetryEventsSender {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 5 * 1000;
  private readonly logger: Logger;
  private intervalId?: NodeJS.Timeout;
  private isSending = false;

  public start(startContract: TelemetryEventsSenderContract) {
    this.logger = startContract.logger.get('telemetry_events');

    this.logger.debug(`Starting task`);
    setTimeout(() => {
      this.sendIfDue();
      this.intervalId = setInterval(() => this.sendIfDue(), this.checkIntervalMs);
    }, this.initialCheckDelayMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async sendIfDue() {
    if (this.isSending) {
      return;
    }

    try {
      this.isSending = true;
      this.logger.debug(`Sending...`);
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
    }
    this.isSending = false;
  }
}
