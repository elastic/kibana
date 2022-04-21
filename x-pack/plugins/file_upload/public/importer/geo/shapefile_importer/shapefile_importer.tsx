/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Feature } from 'geojson';
// @ts-expect-error
import { BrowserFileSystem, DBFLoader, loadInBatches, ShapefileLoader } from '../loaders';
import type { ImportFailure } from '../../../../common/types';
import { ShapefileEditor } from './shapefile_editor';
import { AbstractGeoFileImporter } from '../abstract_geo_file_importer';

export const SHAPEFILE_TYPES = ['.shp'];

export class ShapefileImporter extends AbstractGeoFileImporter {
  private _tableRowCount: number | null = null;
  private _dbfFile: File | null = null;
  private _prjFile: File | null = null;
  private _shxFile: File | null = null;
  private _iterator?: Iterator<{ data: Feature[] }>;

  public canPreview() {
    return this._dbfFile !== null && this._prjFile !== null && this._shxFile !== null;
  }

  public renderEditor(onChange: () => void) {
    return !this.canPreview() ? (
      <ShapefileEditor
        shapefileName={this._getFile().name}
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
    ) : null;
  }

  private async _setTableRowCount() {
    if (!this._dbfFile) {
      return;
    }

    // read header from dbf file to get number of records in data file
    const dbfIterator = (await loadInBatches(this._dbfFile, DBFLoader, {
      metadata: false,
      dbf: { encoding: 'latin1' },
    })) as unknown as Iterator<{ nRecords: number }>;
    const { value } = await dbfIterator.next();
    if (value.nRecords && typeof value.nRecords === 'number') {
      this._tableRowCount = value.nRecords;
    }
  }

  protected _getProgress(featuresProcessed: number, bytesProcessed: number) {
    if (this._tableRowCount === null || this._tableRowCount === 0) {
      return 0;
    }

    if (featuresProcessed > this._tableRowCount) {
      return 100;
    }

    return (featuresProcessed / this._tableRowCount) * 100;
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
      const sideCarFiles: File[] = [];
      if (this._dbfFile) {
        sideCarFiles.push(this._dbfFile);
      }
      if (this._prjFile) {
        sideCarFiles.push(this._prjFile);
      }
      if (this._shxFile) {
        sideCarFiles.push(this._shxFile);
      }
      const fileSystem = new BrowserFileSystem([this._getFile(), ...sideCarFiles]);
      this._iterator = (await loadInBatches(this._getFile().name, ShapefileLoader, {
        fetch: fileSystem.fetch,
        // Reproject shapefiles to WGS84
        gis: { reproject: true, _targetCrs: 'EPSG:4326' },
        // Only parse the X & Y coordinates. Other coords not supported by Elasticsearch.
        shp: { _maxDimensions: 2 },
        metadata: false,
      })) as unknown as Iterator<{ data: Feature[] }>;
      await this._setTableRowCount();
    }

    const { value: batch, done } = await this._iterator.next();

    if (!this._getIsActive() || done) {
      results.hasNext = false;
      return results;
    }

    for (let i = 0; i < batch.data.length; i++) {
      const feature = batch.data[i];
      if (!results.geometryTypesMap.has(feature.geometry.type)) {
        results.geometryTypesMap.set(feature.geometry.type, true);
      }
      results.features.push(feature);

      // Instead of tracking bytes read, which is difficult since reading from multiple binary files
      // track size by features
      const featureChars = JSON.stringify(feature).length;
      results.bytesRead = results.bytesRead + featureChars;
    }

    return results;
  }
}
