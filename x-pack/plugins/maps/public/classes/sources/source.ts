/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactElement } from 'react';
import { copyPersistentState } from '../../reducers/copy_persistent_state';
import { IField } from '../fields/field';
import { FieldFormatter, LAYER_TYPE, MAX_ZOOM, MIN_ZOOM } from '../../../common/constants';
import {
  AbstractSourceDescriptor,
  Attribution,
  DataRequestMeta,
  StyleDescriptor,
  Timeslice,
} from '../../../common/descriptor_types';
import { IStyle } from '../styles/style';
import { LICENSED_FEATURES } from '../../licensed_features';

export type OnSourceChangeArgs = {
  propName: string;
  value: unknown;
  newLayerType?: LAYER_TYPE;
};

export type SourceEditorArgs = {
  currentLayerType: string;
  numberOfJoins: number;
  onChange: (...args: OnSourceChangeArgs[]) => Promise<void>;
  onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void;
  style: IStyle;
};

export type ImmutableSourceProperty = {
  label: string;
  value: string;
  link?: string;
};

export interface ISource {
  getDisplayName(): Promise<string>;
  getType(): string;
  isFieldAware(): boolean;
  isFilterByMapBounds(): boolean;
  isGeoGridPrecisionAware(): boolean;
  isQueryAware(): boolean;
  isTimeAware(): Promise<boolean>;
  getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
  getAttributionProvider(): (() => Promise<Attribution[]>) | null;
  isESSource(): boolean;
  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null;
  supportsFitToBounds(): Promise<boolean>;
  cloneDescriptor(): AbstractSourceDescriptor;
  getFieldNames(): string[];
  getApplyGlobalQuery(): boolean;
  getApplyGlobalTime(): boolean;
  getApplyForceRefresh(): boolean;
  getIndexPatternIds(): string[];
  getQueryableIndexPatternIds(): string[];
  getGeoGridPrecision(zoom: number): number;
  createFieldFormatter(field: IField): Promise<FieldFormatter | null>;
  getValueSuggestions(field: IField, query: string): Promise<string[]>;
  getMinZoom(): number;
  getMaxZoom(): number;
  getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;
  getUpdateDueToTimeslice(prevMeta: DataRequestMeta, timeslice?: Timeslice): boolean;
}

export class AbstractSource implements ISource {
  readonly _descriptor: AbstractSourceDescriptor;

  constructor(descriptor: AbstractSourceDescriptor) {
    this._descriptor = descriptor;
  }

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

  getType(): string {
    return this._descriptor.type;
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
    return false;
  }

  getApplyGlobalTime(): boolean {
    return false;
  }

  getApplyForceRefresh(): boolean {
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

  isESSource(): boolean {
    return false;
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

  getUpdateDueToTimeslice(prevMeta: DataRequestMeta, timeslice?: Timeslice): boolean {
    return true;
  }
}
