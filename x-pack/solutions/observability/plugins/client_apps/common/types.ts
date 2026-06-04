/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Common response shape returned by all platform symbolication APIs.
 * Each platform (Android retrace, JS source maps, etc.) returns the original
 * stacktrace alongside the resolved (deobfuscated / unmapped) version.
 */
export interface SymbolicationResponse {
  original: string;
  resolved: string;
}

/** Response from the Android crash document fetch endpoint. */
export interface AndroidCrashDocumentResponse {
  stacktrace: string;
  build_id: string;
}
