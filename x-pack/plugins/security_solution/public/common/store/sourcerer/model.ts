/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { DocValueFields } from '../../../../common/search_strategy/common';
import {
  BrowserFields,
  EMPTY_BROWSER_FIELDS,
  EMPTY_DOCVALUE_FIELD,
  EMPTY_INDEX_PATTERN,
} from '../../../../common/search_strategy/index_fields';

export type ErrorModel = Error[];

export enum SourcererScopeName {
  default = 'default',
  detections = 'detections',
  timeline = 'timeline',
}

export interface ManageScope {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  errorMessage: string | null;
  id: SourcererScopeName;
  indexPattern: Omit<IIndexPattern, 'fieldFormatMap'>;
  indicesExist: boolean | undefined | null;
  loading: boolean;
  selectedPatterns: string[];
}

export interface ManageScopeInit extends Partial<ManageScope> {
  id: SourcererScopeName;
}

export type SourcererScopeById = Record<SourcererScopeName | string, ManageScope>;

export type KibanaIndexPatterns = Array<{ id: string; title: string }>;

// ManageSourcerer
export interface SourcererModel {
  kibanaIndexPatterns: KibanaIndexPatterns;
  configIndexPatterns: string[];
  signalIndexName: string | null;
  sourcererScopes: SourcererScopeById;
}

export const initSourcererScope: Pick<
  ManageScope,
  | 'browserFields'
  | 'docValueFields'
  | 'errorMessage'
  | 'indexPattern'
  | 'indicesExist'
  | 'loading'
  | 'selectedPatterns'
> = {
  browserFields: EMPTY_BROWSER_FIELDS,
  docValueFields: EMPTY_DOCVALUE_FIELD,
  errorMessage: null,
  indexPattern: EMPTY_INDEX_PATTERN,
  indicesExist: true,
  loading: false,
  selectedPatterns: [],
};

export const initialSourcererState: SourcererModel = {
  kibanaIndexPatterns: [],
  configIndexPatterns: [],
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
  [id in SourcererScopeName]: string[];
};
export type SourcererScopePatterns = Partial<FSourcererScopePatterns>;
