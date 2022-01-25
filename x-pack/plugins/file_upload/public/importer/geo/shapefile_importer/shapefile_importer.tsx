/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Feature } from 'geojson';
import { ShapefileLoader } from '@loaders.gl/shapefile';
import {
  _BrowserFileSystem as BrowserFileSystem,
  loadInBatches,
} from '@loaders.gl/core';
import type { ImportFailure } from '../../../../common/types';
import { ShapefileEditor } from './shapefile_editor';
import { AbstractGeoFileImporter } from '../abstract_geo_file_importer';

export const SHAPEFILE_TYPES = ['.shp'];

export class ShapefileImporter extends AbstractGeoFileImporter {
  private _dbfFile: File | null = null;
  private _prjFile: File | null = null;
  private _shxFile: File | null = null;
  private _iterator?: Iterator<unknown>;
  
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

  protected async _readNext(prevTotalFeaturesRead: number, prevTotalBytesRead: number) {
    const results = {
      bytesRead: 0,
      features: [] as Feature[],
      geometryTypesMap: new Map<string, boolean>(),
      invalidFeatures: [] as ImportFailure[],
      hasNext: true,
    };

    if (this._iterator === undefined) {
      const fileSystem = new BrowserFileSystem([
        this._getFile(),
        this._dbfFile,
        this._prjFile,
        this._shxFile,
      ]);
      this._iterator = await loadInBatches(
        this._getFile().name,
        ShapefileLoader,
        {
          fetch: fileSystem.fetch,
          // Reproject shapefiles to WGS84
          gis: { reproject: true, _targetCrs: "EPSG:4326" },
          // Only parse the X & Y coordinates. Other coords not supported by Elasticsearch.
          shp: { _maxDimensions: 2 },
          // Don't log the metadata, only the geo data
          metadata: false,
        });
      console.log(this._iterator);
    }

    const { value: batch, done } = await this._iterator.next();

    console.log(batch);
    console.log(done);

    if (!this._getIsActive() || done) {
      results.hasNext = false;
      return results;
    }

    for (let i = 0; i < batch.data.length; i++) {
      const feature = batch.data[i] as Feature;
      if (!results.geometryTypesMap.has(feature.geometry.type)) {
        results.geometryTypesMap.set(feature.geometry.type, true);
      }
      results.features.push(feature);
    }

    return results;
  }
}
