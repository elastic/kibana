/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature } from 'geojson';
import { ReactNode } from 'react';
import { IImporter } from '../types';
import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/public';

export interface GeoFilePreview {
  features: Feature[];
  hasPoints: boolean;
  hasShapes: boolean;
  previewCoverage: number;
}

export interface GeoFileImporter extends IImporter {
  destroy(): void;
  canPreview(): boolean;
  previewFile(rowLimit?: number, sizeLimit?: number): Promise<GeoFilePreview>;
  renderEditor(onChange: () => void): ReactNode;
  setGeoFieldType(geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE): void;
}
