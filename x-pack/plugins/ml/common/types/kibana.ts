/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// custom edits or fixes for default kibana types which are incomplete

import type { SimpleSavedObject } from 'kibana/public';
import type { IndexPatternAttributes } from 'src/plugins/data/common';
import type { FieldFormatsRegistry } from '../../../../../src/plugins/field_formats/common';

export type IndexPatternTitle = string;

export interface Route {
  id: string;
  k7Breadcrumbs: () => any;
}

export type IndexPatternSavedObject = SimpleSavedObject<IndexPatternAttributes>;
// TODO define saved object type
export type SavedSearchSavedObject = SimpleSavedObject<any>;

export function isSavedSearchSavedObject(
  ss: SavedSearchSavedObject | null
): ss is SavedSearchSavedObject {
  return ss !== null;
}

export type FieldFormatsRegistryProvider = () => Promise<FieldFormatsRegistry>;
