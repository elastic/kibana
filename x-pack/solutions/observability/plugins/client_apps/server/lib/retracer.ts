/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SourceMapFetcher<SourceMapType> {
  fetch: (sources: string[]) => Promise<SourceMapType[]>;
}

/**
 * Minimal logger interface the retracer uses to surface diagnostic
 * warnings.
 */
export interface Logger {
  warn: (message: string) => void;
}

export interface RetracerOptions {
  logger?: Logger;
}

export abstract class Retracer<SourceMapType> {
  protected _stackTrace: string;
  protected _fetcher: SourceMapFetcher<SourceMapType>;
  protected _logger: Logger;

  constructor(
    stackTrace: string,
    sourceMapFetcher: SourceMapFetcher<SourceMapType>,
    options: RetracerOptions = {}
  ) {
    this._stackTrace = stackTrace;
    this._fetcher = sourceMapFetcher;
    this._logger = options.logger ?? {
      warn: (message) => console.warn(message), // eslint-disable-line no-console
    };
  }

  abstract retrace(): Promise<string | undefined>;
}
