/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BrowserFields,
  DocValueFields,
  EMPTY_BROWSER_FIELDS,
  EMPTY_DOCVALUE_FIELD,
  EMPTY_INDEX_PATTERN,
} from '../../containers/sourcerer/format';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns';
import { DEFAULT_INDEX_PATTERN } from '../../../../common/constants';

export type ErrorModel = Error[];

export enum SourcererScopeName {
  default = 'default',
  timeline = 'timeline',
}

export interface ManageScope {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  errorMessage: string | null;
  id: SourcererScopeName;
  indexPattern: IIndexPattern;
  indicesExist: boolean | undefined | null;
  loading: boolean;
  selectedPatterns: string[];
}

export interface ManageScopeInit extends Partial<ManageScope> {
  id: SourcererScopeName;
  allExistingIndexPatterns: string[];
}

export type SourcererScopeById = {
  [id in SourcererScopeName]: ManageScope;
};

export type KibanaIndexPatterns = Array<{ id: string; title: string }>;

// ManageSourcerer
export interface SourcererModel {
  kibanaIndexPatterns: KibanaIndexPatterns;
  allIndexPatterns: string[];
  sourcererScopes: SourcererScopeById;
}

const initSourcererScope = {
  browserFields: EMPTY_BROWSER_FIELDS,
  docValueFields: EMPTY_DOCVALUE_FIELD,
  errorMessage: null,
  indexPattern: EMPTY_INDEX_PATTERN,
  indicesExist: true,
  loading: true,
  selectedPatterns: [],
};

export const initialSourcererState: SourcererModel = {
  kibanaIndexPatterns: [],
  allIndexPatterns: [],
  sourcererScopes: {
    [SourcererScopeName.default]: {
      ...initSourcererScope,
      id: SourcererScopeName.default,
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

export const sourcererScopePatterns: FSourcererScopePatterns = {
  [SourcererScopeName.default]: DEFAULT_INDEX_PATTERN,
  [SourcererScopeName.timeline]: DEFAULT_INDEX_PATTERN,
};

export type SourcererIndexPatterns = Record<string, IIndexPattern>;
