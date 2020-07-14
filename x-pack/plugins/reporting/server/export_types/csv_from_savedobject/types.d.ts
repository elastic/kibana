/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobParamPostPayload, ScheduledTaskParams, TimeRangeParams } from '../../types';

export interface FakeRequest {
  headers: Record<string, unknown>;
}

export interface JobParamsPostPayloadPanelCsv extends JobParamPostPayload {
  state?: any;
}

export interface JobParamsPanelCsv {
  savedObjectType: string;
  savedObjectId: string;
  isImmediate: boolean;
  panel?: SearchPanel;
  post?: JobParamsPostPayloadPanelCsv;
  visType?: string;
}

export interface SavedObjectServiceError {
  statusCode: number;
  error?: string;
  message?: string;
}

export interface SavedObjectMetaJSON {
  searchSourceJSON: string;
}

export interface SavedObjectMeta {
  searchSource: SearchSource;
}

export interface SavedSearchObjectAttributesJSON {
  title: string;
  sort: any[];
  columns: string[];
  kibanaSavedObjectMeta: SavedObjectMetaJSON;
  uiState: any;
}

export interface SavedSearchObjectAttributes {
  title: string;
  sort: any[];
  columns?: string[];
  kibanaSavedObjectMeta: SavedObjectMeta;
  uiState: any;
}

export interface VisObjectAttributesJSON {
  title: string;
  visState: string; // JSON string
  type: string;
  params: any;
  uiStateJSON: string; // also JSON string
  aggs: any[];
  sort: any[];
  kibanaSavedObjectMeta: SavedObjectMeta;
}

export interface VisObjectAttributes {
  title: string;
  visState: string; // JSON string
  type: string;
  params: any;
  uiState: {
    vis: {
      params: {
        sort: {
          columnIndex: string;
          direction: string;
        };
      };
    };
  };
  aggs: any[];
  sort: any[];
  kibanaSavedObjectMeta: SavedObjectMeta;
}

export interface SavedObjectReference {
  name: string; // should be kibanaSavedObjectMeta.searchSourceJSON.index
  type: string; // should be index-pattern
  id: string;
}

export interface SavedObject {
  attributes: any;
  references: SavedObjectReference[];
}

export interface VisPanel {
  indexPatternSavedObjectId?: string;
  savedSearchObjectId?: string;
  attributes: VisObjectAttributes;
  timerange: TimeRangeParams;
}

export interface SearchPanel {
  indexPatternSavedObjectId: string;
  attributes: SavedSearchObjectAttributes;
  timerange: TimeRangeParams;
}

export interface DocValueFields {
  field: string;
  format: string;
}

export interface SearchSourceQuery {
  isSearchSourceQuery: boolean;
}

export interface SearchSource {
  query: SearchSourceQuery;
  filter: any[];
}

/*
 * These filter types are stub types to help ensure things get passed to
 * non-Typescript functions in the right order. An actual structure is not
 * needed because the code doesn't look into the properties; just combines them
 * and passes them through to other non-TS modules.
 */
export interface Filter {
  isFilter: boolean;
}
export interface TimeFilter extends Filter {
  isTimeFilter: boolean;
}
export interface QueryFilter extends Filter {
  isQueryFilter: boolean;
}
export interface SearchSourceFilter extends Filter {
  isSearchSourceFilter: boolean;
}

export interface IndexPatternField {
  scripted: boolean;
  lang?: string;
  script?: string;
  name: string;
}
