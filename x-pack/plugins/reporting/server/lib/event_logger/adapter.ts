/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepMerge from 'deepmerge';
import { LogMeta } from 'src/core/server';
import { LevelLogger } from '../level_logger';
import { IReportingEventLogger } from './logger';

/** @internal */
export class EcsLogAdapter implements IReportingEventLogger {
  start?: Date;
  end?: Date;

  /**
   * This class provides a logging system to Reporting code, using a shape similar to the EventLog service.
   * The logging action causes ECS data with Reporting metrics sent to DEBUG logs.
   *
   * @param {LevelLogger} logger - Reporting's wrapper of the core logger
   * @param {Partial<LogMeta>} properties - initial ECS data with template for Reporting metrics
   */
  constructor(private logger: LevelLogger, private properties: Partial<LogMeta>) {}

  logEvent(message: string, properties: LogMeta) {
    if (this.start && !this.end) {
      this.end = new Date(Date.now());
    }

    let duration: number | undefined;
    if (this.end && this.start) {
      duration = (this.end.valueOf() - this.start.valueOf()) * 1000000; // nanoseconds
    }

    // add the derived properties for timing between "start" and "complete" logging calls
    const newProperties: LogMeta = deepMerge(this.properties, {
      event: {
        duration,
        start: this.start?.toISOString(),
        end: this.end?.toISOString(),
      },
    });

    // sends an ECS object with Reporting metrics to the DEBUG logs
    this.logger.debug(message, ['events'], deepMerge(newProperties, properties));
  }

  startTiming() {
    this.start = new Date(Date.now());
  }

  stopTiming() {
    this.end = new Date(Date.now());
  }
}
