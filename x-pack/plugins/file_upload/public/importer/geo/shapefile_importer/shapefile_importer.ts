/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoFileImporter, GeoFilePreview } from '../types';
import { CreateDocsResponse } from '../../types';
import { Importer } from '../../importer';
import { ES_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

export const SHAPEFILE_TYPES = ['.shp'];

export class ShapefileImporter extends Importer implements GeoFileImporter {
  private _file: File;
  private _isActive = true;
  private _geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE =
    ES_FIELD_TYPES.GEO_SHAPE;

  constructor(file: File) {
    super();

    this._file = file;
  }

  public destroy() {
    this._isActive = false;
  }

  public async previewFile(rowLimit?: number, sizeLimit?: number): Promise<GeoFilePreview> {
    return {
      features: [],
      previewCoverage: 0,
      hasPoints: false,
      hasShapes: false,
    };
  }

  public setGeoFieldType(geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE) {
    this._geoFieldType = geoFieldType;
  }

  public read(data: ArrayBuffer): { success: boolean } {
    throw new Error('read(data: ArrayBuffer) not supported, use readFile instead.');
  }

  protected _createDocs(text: string): CreateDocsResponse {
    throw new Error('_createDocs not implemented.');
  }
}