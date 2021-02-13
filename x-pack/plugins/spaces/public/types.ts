/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSpaceResult } from '../common';

/**
 * The structure for all of the space data that must be loaded for share-to-space components to function.
 */
export interface ShareToSpacesData {
  /** A map of each existing space's ID and its associated {@link ShareToSpaceTarget}. */
  readonly spacesMap: Map<string, ShareToSpaceTarget>;
  /** The ID of the active space. */
  readonly activeSpaceId: string;
}

/**
 * The data that was fetched for a specific space. Includes optional additional fields that are needed to handle edge cases in the
 * share-to-space components that consume it.
 */
export interface ShareToSpaceTarget extends Omit<GetSpaceResult, 'disabledFeatures'> {
  /** True if this space is the active space. */
  isActiveSpace?: true;
  /** True if the user has read access to this space, but is not authorized to share objects into this space. */
  cannotShareToSpace?: true;
  /** True if the current feature (specified in the `SpacesContext`) is disabled in this space. */
  isFeatureDisabled?: true;
}
