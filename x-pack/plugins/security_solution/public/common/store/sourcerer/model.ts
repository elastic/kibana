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

export type SourceGroupsType = keyof typeof SourcererScopeName;

export interface ManageSource {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  errorMessage: string | null;
  id: SourceGroupsType;
  indexPattern: IIndexPattern;
  indicesExist: boolean | undefined | null;
  loading: boolean;
  scopePatterns: string[];
  selectedPatterns: string[];
}

export interface ManageSourceInit extends Partial<ManageSource> {
  id: SourceGroupsType;
  selectedPatterns: string[];
}

export type ManageSourceGroupById = {
  [id in SourceGroupsType]?: ManageSource;
};

// ManageSourcerer
export interface SourcererModel {
  activeSourceGroupId: SourceGroupsType;
  kibanaIndexPatterns: string[];
  isIndexPatternsLoading: boolean;
  sourceGroups: ManageSourceGroupById;
}

export const initialSourcererState: SourcererState = {
  activeSourceGroupId: SourcererScopeName.default,
  kibanaIndexPatterns: [],
  isIndexPatternsLoading: true,
  sourceGroups: {},
};

export const sourceGroupSettings = {
  [SourcererScopeName.default]: DEFAULT_INDEX_PATTERN,
  [SourcererScopeName.host]: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
  [SourcererScopeName.detections]: [DEFAULT_SIGNALS_INDEX],
  [SourcererScopeName.timeline]: DEFAULT_INDEX_PATTERN,
  [SourcererScopeName.network]: ['auditbeat-*', 'filebeat-*', 'packetbeat-*'],
};
