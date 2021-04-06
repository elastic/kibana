/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../common/lib/kibana';

export interface CreateTransforms {
  signal: AbortSignal;
  // TODO: Stronger types from the metrics_entities project
  bodies: unknown[];
}

export interface CreateTransform {
  signal: AbortSignal;
  // TODO: Stronger types from the metrics_entities project
  body: unknown;
}

/**
 * Creates transforms given a configuration
 * @param signal AbortSignal for cancelling request
 * @param bodies The bodies for the REST interface that is going to create them one at a time.
 *
 * TODO: Once there is a _bulk API, then we can do these all at once
 * @throws An error if response is not OK
 */
export const createTransforms = async ({ bodies, signal }: CreateTransforms): Promise<void> => {
  for (const body of bodies) {
    await createTransform({ body, signal });
  }
};

/**
 * Creates a single transform given a configuration
 * @param signal AbortSignal for cancelling request
 * @param bodies The body for the REST interface that is going to it.
 * @throws An error if response is not OK
 */
export const createTransform = async ({ body, signal }: CreateTransform): Promise<void> => {
  // TODO: Use constants for the url here or from the metrics package.
  return KibanaServices.get().http.fetch('/api/metrics_entities/transforms', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
};
