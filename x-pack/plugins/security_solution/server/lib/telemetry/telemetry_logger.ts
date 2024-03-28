/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, LogMeta } from '@kbn/core/server';
import type { LogLevelId, LogRecord } from '@kbn/logging';
import { clusterInfo, isElasticCloudDeployment } from './helpers';

export interface TelemetryLogger extends Logger {
  l<Meta extends LogMeta = LogMeta>(message: string, meta?: Meta | object): void;
}

/**
 * This custom logger extends the base kibana Logger with the following functionality:
 *  - Exposes a helper `TelemetryLogger::l` method that logs at the
 *    info or debug level depending on whether the instance is a cloud deployment or not.
 *  - For the above method as well as the regular debug, info, warn, error, etc.
 *    it includes the cluster uuid and name as part of the metadata structured fields.
 *
 * Please try to use a meaningful logger name, e.g.:
 *
 * ```js
 * const log = new TelemetryLoggerImpl(logger.get('tasks.endpoint'), ...);
 * ````
 * instead of
 *
 * ```js
 * const log = new TelemetryLoggerImpl(logger, ...);
 * ````
 *
 * It makes easier to browse the logs by filtering by the structured argument `logger`.
 */
export class TelemetryLoggerImpl implements TelemetryLogger {
  constructor(private readonly delegate: Logger) {}

  l<Meta extends LogMeta = LogMeta>(message: string, meta?: Meta | object | undefined): void {
    if (isElasticCloudDeployment) {
      this.info(message, meta);
    } else {
      this.debug(message, meta);
    }
  }

  trace<Meta extends LogMeta = LogMeta>(message: string, meta?: Meta): void {
    this.delegate.trace(message, logMeta(meta));
  }

  debug<Meta extends LogMeta = LogMeta>(message: string, meta?: Meta): void {
    this.delegate.debug(message, logMeta(meta));
  }

  info<Meta extends LogMeta = LogMeta>(message: string, meta?: Meta): void {
    this.delegate.info(message, logMeta(meta));
  }

  warn<Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta): void {
    this.delegate.warn(errorOrMessage, logMeta(meta));
  }

  error<Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta): void {
    this.delegate.error(errorOrMessage, logMeta(meta));
  }

  fatal<Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta): void {
    this.delegate.fatal(errorOrMessage, logMeta(meta));
  }

  log(record: LogRecord): void {
    this.delegate.log(record);
  }

  isLevelEnabled(level: LogLevelId): boolean {
    return this.delegate.isLevelEnabled(level);
  }

  get(...childContextPaths: string[]): Logger {
    return this.delegate.get(...childContextPaths);
  }
}

export const tlog = (logger: Logger, message: string, meta?: LogMeta) => {
  if (isElasticCloudDeployment) {
    logger.info(message, logMeta(meta));
  } else {
    logger.debug(message, logMeta(meta));
  }
};

// helper method to merge a given LogMeta with the cluster info (if exists)
function logMeta(meta?: LogMeta | undefined): LogMeta {
  const clusterInfoMeta = clusterInfo
    ? {
        cluster_uuid: clusterInfo?.cluster_uuid,
        cluster_name: clusterInfo?.cluster_name,
      }
    : {};
  return {
    ...clusterInfoMeta,
    ...(meta ?? {}),
  };
}
