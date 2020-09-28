/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactElement } from 'react';

import { Adapters } from 'src/plugins/inspector/public';
import { copyPersistentState } from '../../reducers/util';

import { IField } from '../fields/field';
import { FieldFormatter, MAX_ZOOM, MIN_ZOOM } from '../../../common/constants';
import { AbstractSourceDescriptor } from '../../../common/descriptor_types';
import { OnSourceChangeArgs } from '../../connected_components/layer_panel/view';

export type SourceEditorArgs = {
  onChange: (...args: OnSourceChangeArgs[]) => void;
  currentLayerType?: string;
};

export type ImmutableSourceProperty = {
  label: string;
  value: string;
  link?: string;
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

export interface ISource {
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
  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null;
  supportsFitToBounds(): Promise<boolean>;
  showJoinEditor(): boolean;
  getJoinsDisabledReason(): string | null;
  cloneDescriptor(): AbstractSourceDescriptor;
  getFieldNames(): string[];
  getApplyGlobalQuery(): boolean;
  getIndexPatternIds(): string[];
  getQueryableIndexPatternIds(): string[];
  getGeoGridPrecision(zoom: number): number;
  getPreIndexedShape(): Promise<PreIndexedShape | null>;
  createFieldFormatter(field: IField): Promise<FieldFormatter | null>;
  getValueSuggestions(field: IField, query: string): Promise<string[]>;
  getMinZoom(): number;
  getMaxZoom(): number;
}

export class AbstractSource implements ISource {
  readonly _descriptor: AbstractSourceDescriptor;
  readonly _inspectorAdapters?: Adapters | undefined;

  constructor(descriptor: AbstractSourceDescriptor, inspectorAdapters?: Adapters) {
    this._descriptor = descriptor;
    this._inspectorAdapters = inspectorAdapters;
  }

  destroy(): void {}

  cloneDescriptor(): AbstractSourceDescriptor {
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

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null {
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

  showJoinEditor(): boolean {
    return false;
  }

  getJoinsDisabledReason() {
    return null;
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
