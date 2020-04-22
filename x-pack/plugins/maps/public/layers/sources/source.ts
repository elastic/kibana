/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactElement } from 'react';

import { Adapters } from 'src/plugins/inspector/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
// @ts-ignore
import { copyPersistentState } from '../../reducers/util';

import { LayerDescriptor, SourceDescriptor } from '../../../common/descriptor_types';
import { ILayer } from '../layer';
import { IField } from '../fields/field';
import { MAX_ZOOM, MIN_ZOOM } from '../../../common/constants';

export type ImmutableSourceProperty = {
  label: string;
  value: string;
};

export type Attribution = {
  url: string;
  label: string;
};

export type PreIndexedShape = {
  index: string;
  id: string | number;
  path: string;
};

export type FieldFormatter = (value: string | number | null | undefined | boolean) => string;

export interface ISource {
  createDefaultLayer(options?: Partial<LayerDescriptor>): ILayer;
  destroy(): void;
  getDisplayName(): Promise<string>;
  getInspectorAdapters(): Adapters | undefined;
  isFieldAware(): boolean;
  isFilterByMapBounds(): boolean;
  isGeoGridPrecisionAware(): boolean;
  isQueryAware(): boolean;
  isRefreshTimerAware(): boolean;
  isTimeAware(): Promise<boolean>;
  getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
  getAttributions(): Promise<Attribution[]>;
  isESSource(): boolean;
  renderSourceSettingsEditor({ onChange }: { onChange: () => void }): ReactElement<any> | null;
  supportsFitToBounds(): Promise<boolean>;
  isJoinable(): boolean;
  cloneDescriptor(): SourceDescriptor;
  getFieldNames(): string[];
  getApplyGlobalQuery(): boolean;
  getIndexPatternIds(): string[];
  getQueryableIndexPatternIds(): string[];
  getGeoGridPrecision(zoom: number): number;
  shouldBeIndexed(): boolean;
  getPreIndexedShape(): Promise<PreIndexedShape | null>;
  createFieldFormatter(field: IField): Promise<FieldFormatter | null>;
  getValueSuggestions(field: IField, query: string): Promise<string[]>;
  getMinZoom(): number;
  getMaxZoom(): number;
}

export class AbstractSource implements ISource {
  readonly _descriptor: SourceDescriptor;
  readonly _inspectorAdapters?: Adapters | undefined;

  constructor(descriptor: SourceDescriptor, inspectorAdapters?: Adapters) {
    this._descriptor = descriptor;
    this._inspectorAdapters = inspectorAdapters;
  }

  destroy(): void {}

  cloneDescriptor(): SourceDescriptor {
    // @ts-ignore
    return copyPersistentState(this._descriptor);
  }

  async supportsFitToBounds(): Promise<boolean> {
    return true;
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

  createDefaultLayer(options?: Partial<LayerDescriptor>): ILayer {
    throw new Error(`Source#createDefaultLayer not implemented`);
  }

  async getDisplayName(): Promise<string> {
    return '';
  }

  async getAttributions(): Promise<Attribution[]> {
    return [];
  }

  isFieldAware(): boolean {
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

  renderSourceSettingsEditor() {
    return null;
  }

  getApplyGlobalQuery(): boolean {
    return !!this._descriptor.applyGlobalQuery;
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

  isJoinable(): boolean {
    return false;
  }

  shouldBeIndexed(): boolean {
    return false;
  }

  isESSource(): boolean {
    return false;
  }

  // Returns geo_shape indexed_shape context for spatial quering by pre-indexed shapes
  async getPreIndexedShape(/* properties */): Promise<PreIndexedShape | null> {
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

  getMinZoom() {
    return MIN_ZOOM;
  }

  getMaxZoom() {
    return MAX_ZOOM;
  }
}
