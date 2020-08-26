/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BrowserFields, DocValueFields } from '../../containers/sourcerer/format';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns';
import { SourcererState } from './reducer';
import { DEFAULT_INDEX_PATTERN, DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';

export type ErrorModel = Error[];

export enum SourcererScopeName {
  default = 'default',
  host = 'host',
  detections = 'detections',
  timeline = 'timeline',
  network = 'network',
}

// export type SourcererScopesType = keyof typeof SourcererScopeName;

export interface ManageScope {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  errorMessage: string | null;
  id: SourcererScopeName;
  indexPattern: IIndexPattern;
  indicesExist: boolean | undefined | null;
  loading: boolean;
  scopePatterns: string[];
  selectedPatterns: string[];
}

export interface ManageScopeInit extends Partial<ManageScope> {
  id: SourcererScopeName;
  selectedPatterns: string[];
}

export type SourcererScopeById = {
  [id in SourcererScopeName]?: ManageScope;
};

// ManageSourcerer
export interface SourcererModel {
  activeSourcererScopeId: SourcererScopeName;
  kibanaIndexPatterns: string[];
  isIndexPatternsLoading: boolean;
  sourcererScopes: SourcererScopeById;
}

export const initialSourcererState: SourcererState = {
  activeSourcererScopeId: SourcererScopeName.default,
  kibanaIndexPatterns: [],
  isIndexPatternsLoading: true,
  sourcererScopes: {},
};

export type FSourcererScopePatterns = {
  [id in SourcererScopeName]: string[];
};
export type SourcererScopePatterns = Partial<FSourcererScopePatterns>;

export const sourcererScopePatterns: FSourcererScopePatterns = {
  [SourcererScopeName.default]: DEFAULT_INDEX_PATTERN,
  [SourcererScopeName.host]: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
  [SourcererScopeName.detections]: [DEFAULT_SIGNALS_INDEX],
  [SourcererScopeName.timeline]: DEFAULT_INDEX_PATTERN,
  [SourcererScopeName.network]: ['auditbeat-*', 'filebeat-*', 'packetbeat-*'],
};
