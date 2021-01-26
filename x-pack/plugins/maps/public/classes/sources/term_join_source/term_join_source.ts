/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GeoJsonProperties } from 'geojson';
import { IField } from '../../fields/field';
import { Query } from '../../../../../../../src/plugins/data/common/query';
import {
  VectorJoinSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { PropertiesMap } from '../../../../common/elasticsearch_util';
import { ITooltipProperty } from '../../tooltips/tooltip_property';

export interface ITermJoinSource {
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
  getMetricFields(): IField[];
  destroy(): void;
  getIndexPatternIds(): string[];
  getQueryableIndexPatternIds(): string[];
  getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
}
