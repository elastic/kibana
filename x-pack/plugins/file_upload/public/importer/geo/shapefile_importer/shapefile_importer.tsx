/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ShapefileEditor } from './shapefile_editor';
import { AbstractGeoFileImporter } from '../abstract_geo_file_importer';

export const SHAPEFILE_TYPES = ['.shp'];

export class ShapefileImporter extends AbstractGeoFileImporter {
  private _dbfFile: File | null = null;
  private _prjFile: File | null = null;
  private _shxFile: File | null = null;
  
  public canPreview() {
    return this._dbfFile !== null && this._prjFile !== null && this._shxFile !== null;
  }

  public renderEditor(onChange: () => void) {
    return (
      <ShapefileEditor
        onDbfSelect={(file) => {
          this._dbfFile = file;
          onChange();
        }}
        onPrjSelect={(file) => {
          this._prjFile = file;
          onChange();
        }}
        onShxSelect={(file) => {
          this._shxFile = file;
          onChange();
        }}
      />
    );
  }
}
