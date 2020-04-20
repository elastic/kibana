/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AbstractSourceDescriptor, LayerDescriptor } from '../../../common/descriptor_types';
import { ILayer } from '../layer';

export type ImmutableSourceProperty = {
  label: string;
  value: string;
};

export type Attribution = {
  url: string;
  label: string;
};

export interface ISource {
  createDefaultLayer(options?: LayerDescriptor): ILayer;
  destroy(): void;
  getDisplayName(): Promise<string>;
  getInspectorAdapters(): object;
  isFieldAware(): boolean;
  isFilterByMapBounds(): boolean;
  isGeoGridPrecisionAware(): boolean;
  isQueryAware(): boolean;
  isRefreshTimerAware(): Promise<boolean>;
  isTimeAware(): Promise<boolean>;
  getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
  getAttributions(): Promise<Attribution[]>;
  getMinZoom(): number;
  getMaxZoom(): number;
}

export class AbstractSource implements ISource {
  readonly _descriptor: AbstractSourceDescriptor;
  constructor(sourceDescriptor: AbstractSourceDescriptor, inspectorAdapters?: object);

  destroy(): void;
  createDefaultLayer(options?: LayerDescriptor, mapColors?: string[]): ILayer;
  getDisplayName(): Promise<string>;
  getInspectorAdapters(): object;
  isFieldAware(): boolean;
  isFilterByMapBounds(): boolean;
  isGeoGridPrecisionAware(): boolean;
  isQueryAware(): boolean;
  isRefreshTimerAware(): Promise<boolean>;
  isTimeAware(): Promise<boolean>;
  getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
  getAttributions(): Promise<Attribution[]>;
  getMinZoom(): number;
  getMaxZoom(): number;
}
