/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decode } from 'rison-node';
import { isPanelViewAndParameters } from '../models/location_search';
import { PanelViewAndParameters } from '../types';
import { parameterName } from './parameter_name';

/**
 * Return a value `PanelViewAndParameters` based on `locationSearch` and `resolverComponentInstanceID`.
 * Used by selectors.
 */
export function panelViewAndParameters({
  locationSearch,
  resolverComponentInstanceID,
}: {
  locationSearch?: string;
  resolverComponentInstanceID?: string;
}): PanelViewAndParameters {
  if (locationSearch === undefined || resolverComponentInstanceID === undefined) {
    // Equivalent to `null`
    return defaultParameters();
  }
  const urlSearchParams = new URLSearchParams(locationSearch);
  const value = urlSearchParams.get(parameterName(resolverComponentInstanceID));
  if (value === null) {
    // Equivalent to `null`
    return defaultParameters();
  }
  const decodedValue: unknown = decode(value);
  if (isPanelViewAndParameters(decodedValue)) {
    return decodedValue;
  }
  return defaultParameters();
}

/**
 * The default parameters to use when no (valid) location search is available.
 */
function defaultParameters(): PanelViewAndParameters {
  // Note, this really should be a selector. it needs to know about the state of the app so it can select
  // the origin event.
  return {
    panelView: 'nodes',
  };
}
