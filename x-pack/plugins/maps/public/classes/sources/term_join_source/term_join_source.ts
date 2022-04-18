/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoJsonProperties } from 'geojson';
import { Query } from '@kbn/data-plugin/common/query';
import { IField } from '../../fields/field';
import { VectorJoinSourceRequestMeta } from '../../../../common/descriptor_types';
import { PropertiesMap } from '../../../../common/elasticsearch_util';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { ISource } from '../source';

export interface ITermJoinSource extends ISource {
  hasCompleteConfig(): boolean;
  getTermField(): IField;
  getWhereQuery(): Query | undefined;
  getPropertiesMap(
    searchFilters: VectorJoinSourceRequestMeta,
    leftSourceName: string,
    leftFieldName: string,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<PropertiesMap>;

  /*
   * Vector layer avoids unnecessarily re-fetching join data.
   * Use getSyncMeta to expose fields that require join data re-fetch when changed.
   */
  getSyncMeta(): object | null;

  getId(): string;
  getRightFields(): IField[];
  getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  getFieldByName(fieldName: string): IField | null;
}
