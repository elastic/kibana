/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// custom edits or fixes for default kibana types which are incomplete

import { SimpleSavedObject } from 'kibana/public';
import { IndexPatternAttributes } from 'src/plugins/data/common';

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
