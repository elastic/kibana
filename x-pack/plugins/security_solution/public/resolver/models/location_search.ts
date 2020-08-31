/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decode } from 'rison-node';
import { PanelViewAndParameters } from '../types';
import * as schema from './schema';

/**
 */
export function panelViewAndParameters(
  locationSearch: string,
  resolverComponentInstanceID: string
): PanelViewAndParameters {
  const urlSearchParams = new URLSearchParams(locationSearch);
  const value = urlSearchParams.get(parameterName(resolverComponentInstanceID));

  // If the value is `null` then no search params were found.
  if (value !== null) {
    const decodedValue = decode(value);
    if (isPanelViewAndParameters(decodedValue)) {
      return decodedValue;
    }
  }
  return defaultParameters();
}

const isPanelViewAndParameters: (value: unknown) => value is PanelViewAndParameters = schema.oneOf([
  schema.object({
    panelView: schema.literal('nodes' as const),
  }),
  schema.object({
    panelView: schema.literal('nodeDetail' as const),
    panelParameters: schema.object({
      nodeID: schema.string(),
    }),
  }),
  schema.object({
    panelView: schema.literal('nodeEvents' as const),
    panelParameters: schema.object({
      nodeID: schema.string(),
    }),
  }),
  schema.object({
    panelView: schema.literal('nodeEventsOfType' as const),
    panelParameters: schema.object({
      nodeID: schema.string(),
      eventType: schema.string(),
    }),
  }),
  schema.object({
    panelView: schema.literal('eventDetail' as const),
    panelParameters: schema.object({
      nodeID: schema.string(),
      eventType: schema.string(),
      eventID: schema.string(),
    }),
  }),
]);

/**
 * The parameter name that we use to read/write state to the query string
 */
function parameterName(resolverComponentInstanceID: string): string {
  return `resolver-${resolverComponentInstanceID}`;
}

/**
 * The default parameters to use when no (valid) location search is available.
 */
export function defaultParameters(): PanelViewAndParameters {
  // Note, this really should be a selector. it needs to know about the state of the app so it can select
  // the origin event.
  return {
    panelView: 'nodes',
  };
}
