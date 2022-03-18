/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { GeoJsonProperties } from 'geojson';
import type { Query } from 'src/plugins/data/common';
import { FIELD_ORIGIN, SOURCE_TYPES, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import {
  MapExtent,
  TableSourceDescriptor,
  VectorJoinSourceRequestMeta,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import { ITermJoinSource } from '../term_join_source';
import { BucketProperties, PropertiesMap } from '../../../../common/elasticsearch_util';
import { IField } from '../../fields/field';
import {
  AbstractVectorSource,
  BoundsRequestMeta,
  GeoJsonWithMeta,
  IVectorSource,
  SourceStatus,
} from '../vector_source';
import { DataRequest } from '../../util/data_request';
import { InlineField } from '../../fields/inline_field';
import { ITooltipProperty, TooltipProperty } from '../../tooltips/tooltip_property';

export class TableSource extends AbstractVectorSource implements ITermJoinSource, IVectorSource {
  static type = SOURCE_TYPES.TABLE_SOURCE;

  static createDescriptor(descriptor: Partial<TableSourceDescriptor>): TableSourceDescriptor {
    return {
      type: SOURCE_TYPES.TABLE_SOURCE,
      __rows: descriptor.__rows || [],
      __columns: descriptor.__columns || [],
      term: descriptor.term || '',
      id: descriptor.id || uuid(),
    };
  }

  readonly _descriptor: TableSourceDescriptor;

  constructor(descriptor: Partial<TableSourceDescriptor>, inspectorAdapters?: Adapters) {
    const sourceDescriptor = TableSource.createDescriptor(descriptor);
    super(sourceDescriptor, inspectorAdapters);
    this._descriptor = sourceDescriptor;
  }

  async getDisplayName(): Promise<string> {
    // no need to localize. this is never rendered.
    return `table source ${uuid()}`;
  }

  getSyncMeta(): null {
    return null;
  }

  async getPropertiesMap(
    searchFilters: VectorJoinSourceRequestMeta,
    leftSourceName: string,
    leftFieldName: string,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<PropertiesMap> {
    const propertiesMap: PropertiesMap = new Map<string, BucketProperties>();

    const fieldNames = await this.getFieldNames();

    for (let i = 0; i < this._descriptor.__rows.length; i++) {
      const row: { [key: string]: string | number } = this._descriptor.__rows[i];
      let propKey: string | number | undefined;
      const props: { [key: string]: string | number } = {};
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          if (key === this._descriptor.term && row[key]) {
            propKey = row[key];
          }
          if (fieldNames.indexOf(key) >= 0 && key !== this._descriptor.term) {
            props[key] = row[key];
          }
        }
      }
      if (propKey && !propertiesMap.has(propKey.toString())) {
        // If propKey is not a primary key in the table, this will favor the first match
        propertiesMap.set(propKey.toString(), props);
      }
    }

    return propertiesMap;
  }

  getTermField(): IField {
    const column = this._descriptor.__columns.find((c) => {
      return c.name === this._descriptor.term;
    });

    if (!column) {
      throw new Error(
        `Cannot find column for ${this._descriptor.term} in ${JSON.stringify(
          this._descriptor.__columns
        )}`
      );
    }

    return new InlineField<TableSource>({
      fieldName: column.name,
      label: column.label,
      source: this,
      origin: FIELD_ORIGIN.JOIN,
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
    return this._descriptor.__columns.map((column) => {
      return new InlineField<TableSource>({
        fieldName: column.name,
        label: column.label,
        source: this,
        origin: FIELD_ORIGIN.JOIN,
        dataType: column.type,
      });
    });
  }

  getFieldNames(): string[] {
    return this._descriptor.__columns.map((column) => {
      return column.name;
    });
  }

  hasTooltipProperties(): boolean {
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
    boundsFilters: BoundsRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    return null;
  }

  getFieldByName(fieldName: string): IField | null {
    const column = this._descriptor.__columns.find((c) => {
      return c.name === fieldName;
    });

    if (!column) {
      return null;
    }

    return new InlineField<TableSource>({
      fieldName: column.name,
      label: column.label,
      source: this,
      origin: FIELD_ORIGIN.JOIN,
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
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta> {
    throw new Error('TableSource cannot return GeoJson');
  }

  async getLeftJoinFields(): Promise<IField[]> {
    throw new Error('TableSource cannot be used as a left-layer in a term join');
  }

  getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus {
    throw new Error('must add tooltip content');
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    return [];
  }

  isBoundsAware(): boolean {
    return false;
  }

  async getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    const tooltipProperties: ITooltipProperty[] = [];
    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        const field = this.getFieldByName(key);
        if (field) {
          tooltipProperties.push(new TooltipProperty(key, await field.getLabel(), properties[key]));
        }
      }
    }
    return tooltipProperties;
  }
}
