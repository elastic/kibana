/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SimpleSavedObject } from '../../../../../src/core/public/saved_objects/simple_saved_object';
import type { IndexPatternAttributes } from '../../../../../src/plugins/data/common/index_patterns/types';
import { FieldFormatsRegistry } from '../../../../../src/plugins/field_formats/common/field_formats_registry';

// custom edits or fixes for default kibana types which are incomplete
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
