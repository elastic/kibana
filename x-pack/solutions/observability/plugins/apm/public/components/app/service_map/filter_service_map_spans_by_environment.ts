/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapSpan } from '../../../../common/service_map';

/**
 * Drops spans whose source or destination service env doesn't match. Spans with
 * no env (legacy docs, dependency destinations) are kept.
 */
export function filterServiceMapSpansByEnvironment(
  spans: ServiceMapSpan[],
  environment: string
): ServiceMapSpan[] {
  return spans.filter((span) => {
    if (span.serviceEnvironment && span.serviceEnvironment !== environment) {
      return false;
    }
    const destinationEnv = span.destinationService?.serviceEnvironment;
    if (destinationEnv && destinationEnv !== environment) {
      return false;
    }
    return true;
  });
}
