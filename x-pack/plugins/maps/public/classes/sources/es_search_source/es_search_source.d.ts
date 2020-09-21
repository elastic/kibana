/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractESSource } from '../es_source';
import { ESSearchSourceDescriptor, MapFilters } from '../../../../common/descriptor_types';
import { ITiledSingleLayerVectorSource } from '../vector_source';

export class ESSearchSource extends AbstractESSource implements ITiledSingleLayerVectorSource {
  static createDescriptor(sourceConfig: unknown): ESSearchSourceDescriptor;

  constructor(sourceDescriptor: Partial<ESSearchSourceDescriptor>, inspectorAdapters: unknown);
  getFieldNames(): string[];

  getUrlTemplateWithMeta(
    searchFilters: MapFilters
  ): Promise<{
    layerName: string;
    urlTemplate: string;
    minSourceZoom: number;
    maxSourceZoom: number;
  }>;
  getLayerName(): string;
}
