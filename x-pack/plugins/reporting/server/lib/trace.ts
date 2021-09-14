/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';

export function startTrace(name: string, category: string) {
  const span = apm.startSpan(name, category);
  return () => {
    if (span) span.end();
  };
}
