/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { GeoJsonProperties } from 'geojson';
import { SOURCE_TYPES } from '../../../../common/constants';
import {
  TableSourceDescriptor,
  VectorJoinSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import { AbstractSource } from '../source';
import { ITermJoinSource } from '../term_join_source';
import { PropertiesMap } from '../../../../common/elasticsearch_util';
import { IField } from '../../fields/field';
import { Query } from '../../../../../../../src/plugins/data/common/query';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { IESAggField } from '../../fields/agg';

export class TableSource extends AbstractSource implements ITermJoinSource {
  static type = SOURCE_TYPES.TABLE_SOURCE;

  static createDescriptor(descriptor: Partial<TableSourceDescriptor>): TableSourceDescriptor {
    return {
      type: SOURCE_TYPES.TABLE_SOURCE,
      __table: descriptor.__table || { columns: [], values: [] },
      termField: descriptor.termField,
      id: descriptor.id || uuid(),
      metrics: [],
    };
  }

  readonly _descriptor: TableSourceDescriptor;

  constructor(descriptor: TableSourceDescriptor, inspectorAdapters?: Adapters) {
    const sourceDescriptor = TableSource.createDescriptor(descriptor);
    super(descriptor, inspectorAdapters);
    this._descriptor = sourceDescriptor;
  }

  async getDisplayName(): Promise<string> {
    // no need to localize. this is never rendered.
    return `table source ${uuid()}`;
  }

  getSyncMeta(): VectorSourceSyncMeta | null {
    return null;
  }

  async getPropertiesMap(
    searchFilters: VectorJoinSourceRequestMeta,
    leftSourceName: string,
    leftFieldName: string,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<PropertiesMap> {
    throw new Error('not implemented');
  }

  getTermField(): IField {
    throw new Error('not implemented');
  }

  getWhereQuery(): Query | undefined {
    return undefined;
  }

  hasCompleteConfig(): boolean {
    return true;
  }

  getId(): string {
    throw new Error('must implement');
  }

  getMetricFields(): IField[] {
    return [];
  }

  getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    throw new Error('must implement');
  }

  getApplyGlobalTime(): boolean {
    return false;
  }

  async isTimeAware(): Promise<boolean> {
    return false;
  }
  getFieldNames(): string[] {
    throw new Error('must implement');
  }

  getMetricFieldForName(fieldName: string): IESAggField | null {
    throw new Error('Not implemented');
  }

  hasMatchingMetricField(fieldName: string): boolean {
    return false;
  }
}
