/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import _ from 'lodash';
import { IField, IVectorSource } from '../../../maps/public';
import { FIELD_ORIGIN } from '../../../maps/common';
import { TileMetaFeature } from '../../../maps/common/descriptor_types';
import { AnomalySource } from './anomaly_source';
import { ITooltipProperty } from '../../../maps/public';
import { Filter } from '../../../../../src/plugins/data/public';

export class RecordScoreTooltipProperty implements ITooltipProperty {
  private readonly _label: string;
  private readonly _value: string;

  constructor(label: string, value: string) {
    this._label = label;
    this._value = value;
  }

  async getESFilters(): Promise<Filter[]> {
    return [];
  }

  getHtmlDisplayValue(): string {
    return this._value.toString();
  }

  getPropertyKey(): string {
    return this._label;
  }

  getPropertyName(): string {
    return this._label;
  }

  getRawValue(): string | string[] | undefined {
    return this._value.toString();
  }

  isFilterable(): boolean {
    return false;
  }
}

export class RecordScoreField implements IField {
  private readonly _source: AnomalySource;

  constructor({ source }: { source: AnomalySource }) {
    this._source = source;
  }

  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
    return new RecordScoreTooltipProperty(
      await this.getLabel(),
      _.escape(Array.isArray(value) ? value.join() : value ? value : '')
    );
  }

  async getDataType(): Promise<string> {
    return 'number';
  }

  async getLabel(): Promise<string> {
    return 'Record score';
  }

  getName(): string {
    return 'record_score';
  }

  getMbFieldName(): string {
    return this.getName();
  }

  getOrigin(): FIELD_ORIGIN {
    return FIELD_ORIGIN.SOURCE;
  }

  getRootName(): string {
    return this.getName();
  }

  getSource(): IVectorSource {
    return this._source;
  }

  isCount() {
    return false;
  }

  isEqual(field: IField): boolean {
    return this.getName() === field.getName();
  }

  isValid(): boolean {
    return true;
  }

  pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature) {
    return null;
  }

  // NA
  canReadFromGeoJson(): boolean {
    return false;
  }

  // NA
  canValueBeFormatted(): boolean {
    return false;
  }

  // NA
  supportsAutoDomain(): boolean {
    return false;
  }

  // NA
  supportsFieldMeta(): boolean {
    return false;
  }

  supportsFieldMetaFromLocalData(): boolean {
    return false;
  }

  supportsFieldMetaFromEs(): boolean {
    return false;
  }

  // NA
  async getPercentilesFieldMetaRequest(percentiles: number[]): Promise<unknown | null> {
    return null;
  }

  // NA
  async getExtendedStatsFieldMetaRequest(): Promise<unknown | null> {
    return undefined;
  }
  // NA
  async getCategoricalFieldMetaRequest(size: number): Promise<unknown> {
    return undefined;
  }
}
