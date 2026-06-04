/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export type { Logger };

export interface SourceMapFetcher<SourceMapType> {
  fetch: (sources: string[]) => Promise<SourceMapType[]>;
}

export interface RetracerOptions {
  logger?: Logger;
}

export abstract class Retracer<SourceMapType> {
  protected _stackTrace: string;
  protected _fetcher: SourceMapFetcher<SourceMapType>;
  protected _logger: Logger | undefined;

  constructor(
    stackTrace: string,
    sourceMapFetcher: SourceMapFetcher<SourceMapType>,
    options: RetracerOptions = {}
  ) {
    this._stackTrace = stackTrace;
    this._fetcher = sourceMapFetcher;
    this._logger = options.logger;
  }

  abstract retrace(): Promise<string | undefined>;
}
