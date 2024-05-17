/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFileExtension, validateFile } from '../validate_file';
import { GEOJSON_FILE_TYPES, GeoJsonImporter } from './geojson_importer';
import { SHAPEFILE_TYPES, ShapefileImporter } from './shapefile_importer';
import type { GeoFileImporter } from './types';

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
