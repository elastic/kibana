/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractESAggSource } from '../es_agg_source';
import {
  ESGeoGridSourceDescriptor,
  MapFilters,
  MapQuery,
  VectorSourceSyncMeta,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { GRID_RESOLUTION } from '../../../../common/constants';
import { IField } from '../../fields/field';
import { ITiledSingleLayerVectorSource } from '../vector_source';

export class ESGeoGridSource extends AbstractESAggSource implements ITiledSingleLayerVectorSource {
  static createDescriptor({
    indexPatternId,
    geoField,
    requestType,
    resolution,
  }: Partial<ESGeoGridSourceDescriptor>): ESGeoGridSourceDescriptor;

  constructor(sourceDescriptor: ESGeoGridSourceDescriptor, inspectorAdapters: unknown);

  readonly _descriptor: ESGeoGridSourceDescriptor;

  getFieldNames(): string[];
  getGridResolution(): GRID_RESOLUTION;
  getGeoGridPrecision(zoom: number): number;
  createField({ fieldName }: { fieldName: string }): IField;

  getLayerName(): string;

  getUrlTemplateWithMeta(
    searchFilters: VectorSourceRequestMeta
  ): Promise<{
    layerName: string;
    urlTemplate: string;
    minSourceZoom: number;
    maxSourceZoom: number;
  }>;
}
