/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Common response shape returned by all platform retrace APIs.
 * Each platform returns the original obfuscated stacktrace alongside
 * the retraced (human-readable) version so the UI can show both.
 */
export interface RetraceResponse {
  original: string;
  retraced: string;
}

/** Response from the Android crash document fetch endpoint. */
export interface AndroidCrashDocumentResponse {
  stacktrace: string;
  build_id: string;
}
