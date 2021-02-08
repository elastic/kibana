/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSpaceResult } from '../common';

export interface SpacesData {
  readonly spacesMap: Map<string, SpaceData>;
  readonly activeSpaceId: string;
}

export interface SpaceData extends Omit<GetSpaceResult, 'disabledFeatures'> {
  /** True if this space is the active space. */
  isActiveSpace?: boolean;
  /** True if the user has read access to this space, but is not authorized to share objects into this space. */
  isPartiallyAuthorized?: boolean;
  /** True if the current feature (specified in the `SpacesContext`) is disabled in this space. */
  isFeatureDisabled?: boolean;
}
