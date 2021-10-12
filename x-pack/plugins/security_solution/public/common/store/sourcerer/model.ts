/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/api/types';
import { FieldSpec } from '../../../../../../../src/plugins/data/common';
import {
  BrowserFields,
  DocValueFields,
  EMPTY_BROWSER_FIELDS,
  EMPTY_DOCVALUE_FIELD,
  EMPTY_INDEX_FIELDS,
} from '../../../../../timelines/common';

export type ErrorModel = Error[];

export enum SourcererScopeName {
  default = 'default',
  detections = 'detections',
  timeline = 'timeline',
}

export interface SourcererScope {
  id: SourcererScopeName;
  loading: boolean;
  selectedDataViewId: string;
  selectedPatterns: string[];
}

export interface SourcererScopeInit extends Partial<SourcererScope> {
  id: SourcererScopeName;
}

export type SourcererScopeById = Record<SourcererScopeName, SourcererScope>;

export interface SourcererDataView {
  /**
   * title of Kibana Index Pattern
   * title also serves as "all pattern list", including inactive
   */
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  /** Uniquely identifies a Kibana Data View */
  id: string;
  indexFields: FieldSpec[];
  /** set when data view fields are fetched */
  loading: boolean;
  /**  list of active patterns that return data  */
  patternList: string[];
  /**  list of all patterns as comma separated string  */
  title: string;
  // Remove once issue resolved: https://github.com/elastic/kibana/issues/111762
  runtimeMappings: MappingRuntimeFields;
}

// ManageSourcerer
export interface SourcererModel {
  defaultDataView: SourcererDataView;
  kibanaDataViews: SourcererDataView[];
  signalIndexName: string | null;
  sourcererScopes: SourcererScopeById;
}

export const initSourcererScope: Omit<SourcererScope, 'id'> = {
  loading: false,
  selectedDataViewId: '',
  selectedPatterns: [],
};
export const initDataView = {
  browserFields: EMPTY_BROWSER_FIELDS,
  docValueFields: EMPTY_DOCVALUE_FIELD,
  id: '',
  indexFields: EMPTY_INDEX_FIELDS,
  loading: false,
  patternList: [],
  runtimeMappings: {},
  title: '',
};

export const initialSourcererState: SourcererModel = {
  defaultDataView: initDataView,
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
