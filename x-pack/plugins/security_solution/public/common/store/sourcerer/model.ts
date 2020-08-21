/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BrowserFields, DocValueFields } from '../../containers/sourcerer/format';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns';

export type ErrorModel = Error[];

export enum SecurityPageName {
  default = 'default',
  host = 'host',
  detections = 'detections',
  timeline = 'timeline',
  network = 'network',
}

export type SourceGroupsType = keyof typeof SecurityPageName;

export interface ManageSource {
  browserFields: BrowserFields;
  defaultPatterns: string[];
  docValueFields: DocValueFields[];
  errorMessage: string | null;
  id: SourceGroupsType;
  indexPattern: IIndexPattern;
  indexPatterns: string[];
  indicesExist: boolean | undefined | null;
  loading: boolean;
}

export interface ManageSourceInit extends Partial<ManageSource> {
  id: SourceGroupsType;
}

export type ManageSourceGroupById = {
  [id in SourceGroupsType]?: ManageSource;
};

// ManageSourcerer
export interface SourcererModel {
  activeSourceGroupId: SourceGroupsType;
  availableIndexPatterns: string[];
  availableSourceGroupIds: SourceGroupsType[];
  isIndexPatternsLoading: boolean;
  sourceGroups: ManageSourceGroupById;
}
