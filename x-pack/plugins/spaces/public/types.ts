/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { SpacesApiUi } from './ui_api';
import type { GetAllSpacesPurpose, GetSpaceResult, Space } from '../common';

/**
 * The structure for all of the space data that must be loaded for share-to-space components to function.
 */
export interface SpacesData {
  /** A map of each existing space's ID and its associated {@link SpacesDataEntry}. */
  readonly spacesMap: Map<string, SpacesDataEntry>;
  /** The ID of the active space. */
  readonly activeSpaceId: string;
}

/**
 * The data that was fetched for a specific space. Includes optional additional fields that are needed to handle edge cases in the
 * share-to-space components that consume it.
 */
export interface SpacesDataEntry
  extends Omit<GetSpaceResult, 'disabledFeatures' | 'authorizedPurposes'> {
  /** True if this space is the active space. */
  isActiveSpace?: true;
  /** True if the current feature (specified in the `SpacesContext`) is disabled in this space. */
  isFeatureDisabled?: true;
  /** Returns true if the user is authorized for the given purpose. */
  isAuthorizedForPurpose(purpose: GetAllSpacesPurpose): boolean;
}

/**
 * Client-side Spaces API.
 */
export interface SpacesApi {
  /**
   * Observable representing the currently active space.
   * The details of the space can change without a full page reload (such as display name, color, etc.)
   */
  getActiveSpace$(): Observable<Space>;

  /**
   * Retrieve the currently active space.
   */
  getActiveSpace(): Promise<Space>;

  /**
   * Determines whether Kibana supports multiple spaces or only the default space.
   *
   * When `xpack.spaces.maxSpaces` is set to 1 Kibana only supports the default space and any spaces related UI can safely be hidden.
   */
  hasOnlyDefaultSpace: boolean;

  /**
   * UI components and services to add spaces capabilities to an application.
   */
  ui: SpacesApiUi;

  /**
   * Indicates whether the solution view is enabled.
   */
  isSolutionViewEnabled: boolean;
}
