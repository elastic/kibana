/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection, GeoJsonProperties } from 'geojson';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { Query } from '@kbn/data-plugin/common/query';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { IField } from '../../fields/field';
import { VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import { PropertiesMap } from '../../../../common/elasticsearch_util';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { ISource } from '../source';

export interface IJoinSource extends ISource {
  hasCompleteConfig(): boolean;
  getWhereQuery(): Query | undefined;
  getPropertiesMap(
    requestMeta: VectorSourceRequestMeta,
    leftSourceName: string,
    leftFieldName: string,
    registerCancelCallback: (callback: () => void) => void,
    inspectorAdapters: Adapters,
    featureCollection?: FeatureCollection
  ): Promise<PropertiesMap>;

  /*
   * Vector layer avoids unnecessarily re-fetching join data.
   * Use getSyncMeta to expose fields that require join data re-fetch when changed.
   */
  getSyncMeta(): object | null;

  getId(): string;
  getRightFields(): IField[];
  getTooltipProperties(
    properties: GeoJsonProperties,
    executionContext: KibanaExecutionContext
  ): Promise<ITooltipProperty[]>;
  getFieldByName(fieldName: string): IField | null;
}

export interface ITermJoinSource extends IJoinSource {
  getTermField(): IField;
}

export function isTermJoinSource(joinSource: IJoinSource) {
  return 'getTermField' in (joinSource as ITermJoinSource);
}
