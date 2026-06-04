/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export type { Logger };

/**
 * Strategy interface for fetching symbolication map documents from a data source.
 *
 * Implementations are responsible for all storage concerns (Elasticsearch, in-memory
 * fixtures, etc.). The retracer algorithm depends only on this interface, which makes
 * it straightforwardly testable without a running Elasticsearch cluster.
 *
 * @typeParam SourceMapType - The document shape returned by this fetcher. Each
 *   platform defines its own (e.g. {@link AndroidClassMap} for Android R8).
 */
export interface SourceMapFetcher<SourceMapType> {
  /**
   * Fetches symbolication map documents for the given source identifiers.
   *
   * Implementations should return one document per identifier that was found,
   * and silently omit identifiers for which no document exists (e.g. SDK classes
   * that were never uploaded). An empty array signals that no mapping data is
   * available, not an error.
   *
   * @param sources - Platform-specific identifiers for the symbols to look up
   *   (e.g. obfuscated class names for Android R8).
   * @returns The matching documents in any order.
   */
  fetch: (sources: string[]) => Promise<SourceMapType[]>;
}

/**
 * Options accepted by all {@link Retracer} subclasses.
 */
export interface RetracerOptions {
  /**
   * Logger used to surface diagnostic warnings (e.g. unrecognised map format
   * versions). When omitted, warnings are silently discarded.
   */
  logger?: Logger;
}

/**
 * Abstract base class for platform-specific stacktrace retracers.
 *
 * Subclasses implement the full symbolication algorithm for one platform
 * (Android R8, JavaScript source maps, etc.) by overriding {@link retrace}.
 * All storage concerns are delegated to the injected {@link SourceMapFetcher},
 * keeping the algorithm independent of Elasticsearch or any other backend.
 *
 * @typeParam SourceMapType - The document shape this retracer understands.
 */
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

  /**
   * Resolves the obfuscated stacktrace back to human-readable form.
   *
   * @returns The deobfuscated stacktrace, or `undefined` if the input was empty
   *   or could not be processed at all.
   */
  abstract retrace(): Promise<string | undefined>;
}
