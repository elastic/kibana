/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractSourceDescriptor, LayerDescriptor } from '../../../common/descriptor_types';
import { ILayer } from '../layer';

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
}

export class AbstractSource implements ISource {
  readonly _descriptor: AbstractSourceDescriptor;
  constructor(sourceDescriptor: AbstractSourceDescriptor, inspectorAdapters?: object);

  destroy(): void;
  createDefaultLayer(options?: LayerDescriptor): ILayer;
  getDisplayName(): Promise<string>;
  getInspectorAdapters(): object;
  isFieldAware(): boolean;
  isFilterByMapBounds(): boolean;
  isGeoGridPrecisionAware(): boolean;
  isQueryAware(): boolean;
  isRefreshTimerAware(): Promise<boolean>;
  isTimeAware(): Promise<boolean>;
  getFieldNames(): string[];
}
