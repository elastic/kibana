/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CoreStart } from '@kbn/core/public';
import { BrowserFields, DocValueFields } from '@kbn/timelines-plugin/common';
import type { DataViewBase } from '@kbn/es-query';
import { FieldSpec } from '@kbn/data-views-plugin/common';

export type KubernetesSecurityServices = CoreStart;

export interface GlobalFullScreen {
  globalFullScreen: boolean;
  setGlobalFullScreen: (fullScreen: boolean) => void;
}

export enum SourcererScopeName {
  default = 'default',
  detections = 'detections',
  timeline = 'timeline',
}

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

export interface SecuritySolutionDataViewBase extends DataViewBase {
  fields: FieldSpec[];
}

export interface SourcererDataView extends KibanaDataView {
  id: string;
  /** determines how we can use the field in the app
   * aggregatable, searchable, type, example
   * category, description, format
   * indices the field is included in etc*/
  browserFields: BrowserFields;
  /** query DSL field and format */
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
export interface FiltersGlobalProps {
  children: React.ReactNode;
  show?: boolean;
}

export interface KubernetesSecurityDeps {
  FiltersGlobal: React.NamedExoticComponent<FiltersGlobalProps>;
  SiemSearchBar: any;
  showGlobalFilters: ({
    globalFullScreen,
    graphEventId,
  }: {
    globalFullScreen: boolean;
    graphEventId: string | undefined;
  }) => boolean;
  useGlobalFullScreen: () => GlobalFullScreen;
  useSourcererDataView: (scopeId?: SourcererScopeName) => SelectedDataView;
}

export interface KubernetesSecurityStart {
  getKubernetesPage: (kubernetesSecurityDeps: KubernetesSecurityDeps) => JSX.Element;
}
