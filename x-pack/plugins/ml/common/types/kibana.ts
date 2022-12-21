/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// custom edits or fixes for default kibana types which are incomplete

import type { SimpleSavedObject } from '@kbn/core/public';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';

export type IndexPatternTitle = string;

export interface Route {
  id: string;
  k7Breadcrumbs: () => any;
}

// TODO define saved object type
export type SavedSearchSavedObject = SimpleSavedObject<any>;

export function isSavedSearchSavedObject(
  ss: SavedSearchSavedObject | null
): ss is SavedSearchSavedObject {
  return ss !== null;
}

export type FieldFormatsRegistryProvider = () => Promise<FieldFormatsRegistry>;
