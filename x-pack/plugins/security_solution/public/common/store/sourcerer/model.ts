/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  BrowserFields,
  DocValueFields,
  EMPTY_BROWSER_FIELDS,
  EMPTY_DOCVALUE_FIELD,
  EMPTY_INDEX_FIELDS,
} from '../../../../../timelines/common';
import { SecuritySolutionDataViewBase } from '../../types';
/** Uniquely identifies a Sourcerer Scope */
export enum SourcererScopeName {
  default = 'default',
  detections = 'detections',
  timeline = 'timeline',
}

/**
 * Data related to each sourcerer scope
 */
export interface SourcererScope {
  /** Uniquely identifies a Sourcerer Scope */
  id: SourcererScopeName;
  /** is an update being made to the sourcerer data view */
  loading: boolean;
  /** selected data view id, null if it is legacy index patterns*/
  selectedDataViewId: string | null;
  /** selected patterns within the data view */
  selectedPatterns: string[];
  /** if has length,
   * id === SourcererScopeName.timeline
   * selectedDataViewId === null OR defaultDataView.id
   * saved timeline has pattern that is not in the default */
  missingPatterns: string[];
}

export type SourcererScopeById = Record<SourcererScopeName, SourcererScope>;

export interface KibanaDataView {
  /** Uniquely identifies a Kibana Data View */
  id: string;
  /**  list of active patterns that return data  */
  patternList: string[];
  /**
   * title of Kibana Data View
   * title also serves as "all pattern list", including inactive
   * comma separated string
   */
  title: string;
}

/**
 * DataView from Kibana + timelines/index_fields enhanced field data
 */
export interface SourcererDataView extends KibanaDataView {
  id: string;
  /** we need this for @timestamp data */
  browserFields: BrowserFields;
  /** we need this for @timestamp data */
  docValueFields: DocValueFields[];
  /** comes from dataView.fields.toSpec() */
  indexFields: SecuritySolutionDataViewBase['fields'];
  /** set when data view fields are fetched */
  loading: boolean;
  /**
   * Needed to pass to search strategy
   * Remove once issue resolved: https://github.com/elastic/kibana/issues/111762
   */
  runtimeMappings: MappingRuntimeFields;
}

/**
 * Combined data from SourcererDataView and SourcererScope to create
 * selected data view state
 */
export interface SelectedDataView {
  browserFields: SourcererDataView['browserFields'];
  dataViewId: string | null; // null if legacy pre-8.0 timeline
  docValueFields: SourcererDataView['docValueFields'];
  /**
   * DataViewBase with enhanced index fields used in timelines
   */
  indexPattern: SecuritySolutionDataViewBase;
  /** do the selected indices exist  */
  indicesExist: boolean;
  /** is an update being made to the data view */
  loading: boolean;
  /** all active & inactive patterns from SourcererDataView['title']  */
  patternList: string[];
  runtimeMappings: SourcererDataView['runtimeMappings'];
  /** all selected patterns from SourcererScope['selectedPatterns'] */
  selectedPatterns: SourcererScope['selectedPatterns'];
  // active patterns when dataViewId == null
  activePatterns?: string[];
}

/**
 * sourcerer model for redux
 */
export interface SourcererModel {
  /** default security-solution data view */
  defaultDataView: SourcererDataView & { id: string; error?: unknown };
  /** all Kibana data views, including security-solution */
  kibanaDataViews: SourcererDataView[];
  /** security solution signals index name */
  signalIndexName: string | null;
  /** sourcerer scope data by id */
  sourcererScopes: SourcererScopeById;
}

export type SourcererUrlState = Partial<{
  [id in SourcererScopeName]: {
    id: string;
    selectedPatterns: string[];
  };
}>;

export const initSourcererScope: Omit<SourcererScope, 'id'> = {
  loading: false,
  selectedDataViewId: null,
  selectedPatterns: [],
  missingPatterns: [],
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
