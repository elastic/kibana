/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { FIELD_ORIGIN, SOURCE_TYPES, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import {
  MapExtent,
  MapFilters,
  MapQuery,
  TableSourceDescriptor,
  TableSourceValue,
  VectorJoinSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import { ITermJoinSource } from '../term_join_source';
import { BucketProperties, PropertiesMap } from '../../../../common/elasticsearch_util';
import { IField } from '../../fields/field';
import { Query } from '../../../../../../../src/plugins/data/common/query';
import {
  AbstractVectorSource,
  BoundsFilters,
  GeoJsonWithMeta,
  IVectorSource,
  SourceTooltipConfig,
} from '../vector_source';
import { DataRequest } from '../../util/data_request';
import { TableField } from '../../fields/table_field';

export class TableSource extends AbstractVectorSource implements ITermJoinSource, IVectorSource {
  static type = SOURCE_TYPES.TABLE_SOURCE;

  static createDescriptor(descriptor: Partial<TableSourceDescriptor>): TableSourceDescriptor {
    return {
      type: SOURCE_TYPES.TABLE_SOURCE,
      __rows: descriptor.__rows || [],
      columns: descriptor.columns || [],
      term: descriptor.term || '',
      id: descriptor.id || uuid(),
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
    const propertiesMap: PropertiesMap = new Map<string, BucketProperties>();

    for (let i = 0; i < this._descriptor.__rows.length; i++) {
      const bucketProperties: BucketProperties = {};
      const row: TableSourceValue[] = this._descriptor.__rows[i];
      let propKey: string | number | undefined;
      for (let j = 0; j < row.length; j++) {
        if (row[j].key === this._descriptor.term) {
          propKey = row[j].value;
        } else {
          bucketProperties[row[j].key] = row[j].value;
        }
      }
      if (propKey) {
        propertiesMap.set(propKey.toString(), bucketProperties);
      }
    }

    return propertiesMap;
  }

  getTermField(): IField {
    const column = this._descriptor.columns.find((c) => {
      return c.name === this._descriptor.term;
    });

    if (!column) {
      throw new Error(
        `Cannot find column for ${this._descriptor.term} in ${JSON.stringify(
          this._descriptor.columns
        )}`
      );
    }

    return new TableField({
      fieldName: column.name,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
      dataType: column.type,
    });
  }

  getWhereQuery(): Query | undefined {
    return undefined;
  }

  hasCompleteConfig(): boolean {
    return true;
  }

  getId(): string {
    return this._descriptor.id;
  }

  getRightFields(): IField[] {
    return this._descriptor.columns.map((column) => {
      return new TableField({
        fieldName: column.name,
        source: this,
        origin: FIELD_ORIGIN.SOURCE,
        dataType: column.type,
      });
    });
  }

  getFieldNames(): string[] {
    return this._descriptor.columns.map((column) => {
      return column.name;
    });
  }

  hasMatchingMetricField(fieldName: string): boolean {
    return !!this.getFieldByName(fieldName);
  }

  canFormatFeatureProperties(): boolean {
    return false;
  }

  createField({ fieldName }: { fieldName: string }): IField {
    const field = this.getFieldByName(fieldName);
    if (!field) {
      throw new Error(`Cannot find field for ${fieldName}`);
    }
    return field;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    return null;
  }

  getFieldByName(fieldName: string): IField | null {
    const column = this._descriptor.columns.find((c) => {
      return c.name === fieldName;
    });

    if (!column) {
      return null;
    }

    return new TableField({
      fieldName: column.name,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
      dataType: column.type,
    });
  }

  getFields(): Promise<IField[]> {
    throw new Error('must implement');
  }

  // The below is the IVectorSource interface.
  // Could be useful to implement, e.g. to preview raw csv data
  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: MapFilters & {
      applyGlobalQuery: boolean;
      applyGlobalTime: boolean;
      fieldNames: string[];
      geogridPrecision?: number;
      sourceQuery?: MapQuery;
      sourceMeta: VectorSourceSyncMeta;
    },
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta> {
    throw new Error('TableSource cannot return GeoJson');
  }

  async getLeftJoinFields(): Promise<IField[]> {
    throw new Error('TableSource cannot be used as a left-layer in a term join');
  }

  getSourceTooltipContent(sourceDataRequest?: DataRequest): SourceTooltipConfig {
    throw new Error('must add tooltip content');
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    return [];
  }

  isBoundsAware(): boolean {
    return false;
  }
}
