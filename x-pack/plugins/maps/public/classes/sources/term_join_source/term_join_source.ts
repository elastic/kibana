/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GeoJsonProperties } from 'geojson';
import type { Query } from '../../../../../../../src/plugins/data/common/query';
import type {
  VectorJoinSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types/data_request_descriptor_types';
import type { PropertiesMap } from '../../../../common/elasticsearch_util/es_agg_utils';
import type { IField } from '../../fields/field';
import type { ITooltipProperty } from '../../tooltips/tooltip_property';
import type { ISource } from '../source';

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
  getSyncMeta(): VectorSourceSyncMeta | null;
  getId(): string;
  getRightFields(): IField[];
  getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  getFieldByName(fieldName: string): IField | null;
}
