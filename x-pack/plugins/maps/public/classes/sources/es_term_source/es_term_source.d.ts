/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapQuery, VectorJoinSourceRequestMeta } from '../../../../common/descriptor_types';
import { IField } from '../../fields/field';
import { IESAggSource } from '../es_agg_source';
import { PropertiesMap } from '../../joins/join';

export interface IESTermSource extends IESAggSource {
  getTermField: () => IField;
  hasCompleteConfig: () => boolean;
  getWhereQuery: () => MapQuery;
  getPropertiesMap: (
    searchFilters: VectorJoinSourceRequestMeta,
    leftSourceName: string,
    leftFieldName: string,
    registerCancelCallback: (callback: () => void) => void
  ) => PropertiesMap;
}
