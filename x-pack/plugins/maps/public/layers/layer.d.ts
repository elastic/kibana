/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LayerDescriptor, MapExtent, MapFilters } from '../../common/descriptor_types';
import { ISource } from './sources/source';
import { DataRequest } from './util/data_request';
import { SyncContext } from '../actions/map_actions';

export interface ILayer {
  getBounds(mapFilters: MapFilters): Promise<MapExtent>;
  getDataRequest(id: string): DataRequest | undefined;
  getDisplayName(source?: ISource): Promise<string>;
  getId(): string;
  getSourceDataRequest(): DataRequest | undefined;
  getSource(): ISource;
  getSourceForEditing(): ISource;
  syncData(syncContext: SyncContext): Promise<void>;
}

export interface ILayerArguments {
  layerDescriptor: LayerDescriptor;
  source: ISource;
}

export class AbstractLayer implements ILayer {
  static createDescriptor(options: Partial<LayerDescriptor>, mapColors?: string[]): LayerDescriptor;
  constructor(layerArguments: ILayerArguments);
  getBounds(mapFilters: MapFilters): Promise<MapExtent>;
  getDataRequest(id: string): DataRequest | undefined;
  getDisplayName(source?: ISource): Promise<string>;
  getId(): string;
  getSourceDataRequest(): DataRequest | undefined;
  getSource(): ISource;
  getSourceForEditing(): ISource;
  syncData(syncContext: SyncContext): Promise<void>;
}
