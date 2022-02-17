/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy } from 'lodash';
import type { Headers } from 'src/core/server';

// @see https://github.com/chromium/chromium/blob/3611052c055897e5ebbc5b73ea295092e0c20141/services/network/public/cpp/header_util_unittest.cc#L50
// For a list of headers that chromium doesn't like
const UNSAFE_HEADERS = [
  'accept-encoding',
  'connection',
  'content-length',
  'content-type',
  'host',
  'referer',
  // `Transfer-Encoding` is hop-by-hop header that is meaningful
  // only for a single transport-level connection, and shouldn't
  // be stored by caches or forwarded by proxies.
  'transfer-encoding',
  'trailer',
  'te',
  'upgrade',
  'keep-alive',
];

const UNSAFE_HEADERS_PATTERNS = [/^proxy-/i];

export function stripUnsafeHeaders(headers: Headers): Headers {
  return omitBy(
    headers,
    (_value, header: string) =>
      header &&
      (UNSAFE_HEADERS.includes(header) ||
        UNSAFE_HEADERS_PATTERNS.some((pattern) => pattern.test(header)))
  );
}
