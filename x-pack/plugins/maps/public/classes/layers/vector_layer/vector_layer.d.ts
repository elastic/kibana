/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Feature, GeoJsonProperties } from 'geojson';
import { AbstractLayer } from '../layer';
import { IVectorSource } from '../../sources/vector_source';
import {
  MapFilters,
  VectorLayerDescriptor,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { ILayer } from '../layer';
import { IJoin } from '../../joins/join';
import { IVectorStyle } from '../../styles/vector/vector_style';
import { IField } from '../../fields/field';
import { DataRequestContext } from '../../../actions';
import { ITooltipProperty } from '../../tooltips/tooltip_property';

export type VectorLayerArguments = {
  source: IVectorSource;
  joins?: IJoin[];
  layerDescriptor: VectorLayerDescriptor;
};

export interface IVectorLayer extends ILayer {
  getFields(): Promise<IField[]>;
  getStyleEditorFields(): Promise<IField[]>;
  getJoins(): IJoin[];
  getValidJoins(): IJoin[];
  getSource(): IVectorSource;
  getFeatureById(id: string | number): Feature | null;
  getPropertiesForTooltip(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  hasJoins(): boolean;
}

export class VectorLayer extends AbstractLayer implements IVectorLayer {
  static type: string;

  protected readonly _style: IVectorStyle;
  static createDescriptor(
    options: Partial<VectorLayerDescriptor>,
    mapColors?: string[]
  ): VectorLayerDescriptor;

  constructor(options: VectorLayerArguments);
  getLayerTypeIconName(): string;
  getFields(): Promise<IField[]>;
  getStyleEditorFields(): Promise<IField[]>;
  getJoins(): IJoin[];
  getValidJoins(): IJoin[];
  _syncSourceStyleMeta(
    syncContext: DataRequestContext,
    source: IVectorSource,
    style: IVectorStyle
  ): Promise<void>;
  _syncSourceFormatters(
    syncContext: DataRequestContext,
    source: IVectorSource,
    style: IVectorStyle
  ): Promise<void>;
  syncLayerWithMB(mbMap: unknown): void;
  _getSearchFilters(
    dataFilters: MapFilters,
    source: IVectorSource,
    style: IVectorStyle
  ): VectorSourceRequestMeta;
  _syncData(
    syncContext: DataRequestContext,
    source: IVectorSource,
    style: IVectorStyle
  ): Promise<void>;
  ownsMbSourceId(sourceId: string): boolean;
  ownsMbLayerId(sourceId: string): boolean;
  _setMbPointsProperties(mbMap: unknown, mvtSourceLayer?: string): void;
  _setMbLinePolygonProperties(mbMap: unknown, mvtSourceLayer?: string): void;
  getSource(): IVectorSource;
  getFeatureById(id: string | number): Feature | null;
  getPropertiesForTooltip(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  hasJoins(): boolean;
  isFittable(): Promise<boolean>;
}
