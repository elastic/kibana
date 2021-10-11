/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/api/types';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import {
  BrowserFields,
  DocValueFields,
  EMPTY_BROWSER_FIELDS,
  EMPTY_DOCVALUE_FIELD,
  EMPTY_INDEX_PATTERN,
} from '../../../../../timelines/common';

export type ErrorModel = Error[];

export enum SourcererScopeName {
  default = 'default',
  detections = 'detections',
  timeline = 'timeline',
}

export interface ManageScope {
  id: SourcererScopeName;
  indicesExist: boolean | undefined | null;
  loading: boolean;
  selectedDataViewId: string;
  selectedPatterns: string[];
}

export interface ManageScopeInit extends Partial<ManageScope> {
  id: SourcererScopeName;
}

export type SourcererScopeById = Record<SourcererScopeName, ManageScope>;

export interface SourcererDataView {
  fetchedFields: boolean;
  /** Uniquely identifies a Kibana Index Pattern */
  id: string;
  /**  list of active patterns that return data  */
  patternList: string[];
  /**
   * title of Kibana Index Pattern
   * title also serves as "all pattern list", including inactive
   */
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  title: string;
  // Remove once issue resolved: https://github.com/elastic/kibana/issues/111762
  runtimeMappings: MappingRuntimeFields;
  // the index pattern value passed to the search to make the query
  // includes fields and a title with active index names
  indexPattern: Omit<IIndexPattern, 'fieldFormatMap'>;
}

// ManageSourcerer
export interface SourcererModel {
  defaultDataView: SourcererDataView;
  kibanaDataViews: SourcererDataView[];
  signalIndexName: string | null;
  sourcererScopes: SourcererScopeById;
}

export const initSourcererScope: Omit<ManageScope, 'id'> = {
  loading: false,
  indicesExist: false,
  selectedDataViewId: '',
  selectedPatterns: [],
};
export const initDataView = {
  fetchedFields: false,
  browserFields: EMPTY_BROWSER_FIELDS,
  docValueFields: EMPTY_DOCVALUE_FIELD,
  id: '',
  indexPattern: EMPTY_INDEX_PATTERN,
  patternList: [],
  runtimeMappings: {},
  title: '',
};

export const initialSourcererState: SourcererModel = {
  defaultDataView: {
    ...initDataView,
  },
  kibanaDataViews: [],
  signalIndexName: null,
  sourcererScopes: {
    [SourcererScopeName.default]: {
      ...initSourcererScope,
      id: SourcererScopeName.default,
    },
    [SourcererScopeName.detections]: {
      ...initSourcererScope,
      id: SourcererScopeName.detections,
    },
    [SourcererScopeName.timeline]: {
      ...initSourcererScope,
      id: SourcererScopeName.timeline,
    },
  },
};

export type FSourcererScopePatterns = {
  [id in SourcererScopeName]: {
    id: string;
    selectedPatterns: string[];
  };
};
export type SourcererScopePatterns = Partial<FSourcererScopePatterns>;
