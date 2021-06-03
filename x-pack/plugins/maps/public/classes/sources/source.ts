/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactElement } from 'react';
import { Adapters } from 'src/plugins/inspector/public';
import { GeoJsonProperties } from 'geojson';
import { copyPersistentState } from '../../reducers/copy_persistent_state';
import { IField } from '../fields/field';
import {
  FieldFormatter,
  LAYER_TYPE,
  MAX_ZOOM,
  MIN_ZOOM,
  SOURCE_TYPES,
} from '../../../common/constants';
import { AbstractSourceDescriptor, Attribution } from '../../../common/descriptor_types';
import { LICENSED_FEATURES } from '../../licensed_features';
import { PreIndexedShape } from '../../../common/elasticsearch_util';

export type OnSourceChangeArgs = {
  propName: string;
  value: unknown;
  newLayerType?: LAYER_TYPE;
};

export type SourceEditorArgs = {
  onChange: (...args: OnSourceChangeArgs[]) => void;
  currentLayerType?: string;
};

export type ImmutableSourceProperty = {
  label: string;
  value: string;
  link?: string;
};

export interface ISource {
  destroy(): void;
  getDisplayName(): Promise<string>;
  getInspectorAdapters(): Adapters | undefined;
  isFieldAware(): boolean;
  isEditable(): Promise<boolean>;
  isFilterByMapBounds(): boolean;
  isGeoGridPrecisionAware(): boolean;
  isQueryAware(): boolean;
  isRefreshTimerAware(): boolean;
  isTimeAware(): Promise<boolean>;
  getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
  getAttributionProvider(): (() => Promise<Attribution[]>) | null;
  isESSource(): boolean;
  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null;
  supportsFitToBounds(): Promise<boolean>;
  showJoinEditor(): boolean;
  getJoinsDisabledReason(): string | null;
  cloneDescriptor(): AbstractSourceDescriptor;
  getFieldNames(): string[];
  getType(): SOURCE_TYPES;
  getApplyGlobalQuery(): boolean;
  getApplyGlobalTime(): boolean;
  getIndexPatternIds(): string[];
  getQueryableIndexPatternIds(): string[];
  getGeoGridPrecision(zoom: number): number;
  getPreIndexedShape(properties: GeoJsonProperties): Promise<PreIndexedShape | null>;
  createFieldFormatter(field: IField): Promise<FieldFormatter | null>;
  getValueSuggestions(field: IField, query: string): Promise<string[]>;
  getMinZoom(): number;
  getMaxZoom(): number;
  getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;
}

export class AbstractSource implements ISource {
  readonly _descriptor: AbstractSourceDescriptor;
  private readonly _inspectorAdapters?: Adapters;

  constructor(descriptor: AbstractSourceDescriptor, inspectorAdapters?: Adapters) {
    this._descriptor = descriptor;
    this._inspectorAdapters = inspectorAdapters;
  }

  destroy(): void {}

  cloneDescriptor(): AbstractSourceDescriptor {
    return copyPersistentState(this._descriptor);
  }

  async supportsFitToBounds(): Promise<boolean> {
    return false;
  }

  /**
   * return list of immutable source properties.
   * Immutable source properties are properties that can not be edited by the user.
   */
  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [];
  }

  getInspectorAdapters(): Adapters | undefined {
    return this._inspectorAdapters;
  }

  async getDisplayName(): Promise<string> {
    return '';
  }

  getAttributionProvider(): (() => Promise<Attribution[]>) | null {
    return null;
  }

  isFieldAware(): boolean {
    return false;
  }

  async isEditable(): Promise<boolean> {
    return false;
  }

  isRefreshTimerAware(): boolean {
    return false;
  }

  isGeoGridPrecisionAware(): boolean {
    return false;
  }

  isQueryAware(): boolean {
    return false;
  }

  getFieldNames(): string[] {
    return [];
  }

  getType(): SOURCE_TYPES {
    return this._descriptor.type as SOURCE_TYPES;
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null {
    return null;
  }

  getApplyGlobalQuery(): boolean {
    return false;
  }

  getApplyGlobalTime(): boolean {
    return false;
  }

  getIndexPatternIds(): string[] {
    return [];
  }

  getQueryableIndexPatternIds(): string[] {
    return [];
  }

  getGeoGridPrecision(zoom: number): number {
    return 0;
  }

  showJoinEditor(): boolean {
    return false;
  }

  getJoinsDisabledReason(): string | null {
    return null;
  }

  isESSource(): boolean {
    return false;
  }

  // Returns geo_shape indexed_shape context for spatial quering by pre-indexed shapes
  async getPreIndexedShape(properties: GeoJsonProperties): Promise<PreIndexedShape | null> {
    return null;
  }

  // Returns function used to format value
  async createFieldFormatter(field: IField): Promise<FieldFormatter | null> {
    return null;
  }

  async getValueSuggestions(field: IField, query: string): Promise<string[]> {
    return [];
  }

  async isTimeAware(): Promise<boolean> {
    return false;
  }

  isFilterByMapBounds(): boolean {
    return false;
  }

  getMinZoom(): number {
    return MIN_ZOOM;
  }

  getMaxZoom(): number {
    return MAX_ZOOM;
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    return [];
  }
}
