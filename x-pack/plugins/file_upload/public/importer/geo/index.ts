/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeoFileImporter } from './types';
import { GeoJsonImporter, GEOJSON_FILE_TYPES } from './geojson_importer';
import { ShapefileImporter, SHAPEFILE_TYPES } from './shapefile_importer';
import { getFileExtension, validateFile } from '../validate_file';

export const GEO_FILE_TYPES = [...GEOJSON_FILE_TYPES, ...SHAPEFILE_TYPES];
const OPTIONS = { checkSizeLimit: false };

export function geoImporterFactory(file: File): GeoFileImporter {
  validateFile(file, GEO_FILE_TYPES, OPTIONS);

  const extension = getFileExtension(file);
  return GEOJSON_FILE_TYPES.includes(extension)
    ? new GeoJsonImporter(file)
    : new ShapefileImporter(file);
}

export type { GeoFileImporter, GeoFilePreview } from './types';
