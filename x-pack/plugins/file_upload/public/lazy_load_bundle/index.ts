/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FeatureCollection } from 'geojson';
import { HttpStart } from 'src/core/public';
import { IImporter, ImportFactoryOptions } from '../importer';
import { getHttp } from '../kibana_services';
import { ES_FIELD_TYPES } from '../../../../../src/plugins/data/public';
import { IndexNameFormProps } from '../';

export interface FileUploadGeoResults {
  indexPatternId: string;
  geoFieldName: string;
  geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE;
  docCount: number;
}

export interface FileUploadComponentProps {
  isIndexingTriggered: boolean;
  onFileSelect: (geojsonFile: FeatureCollection, name: string, previewCoverage: number) => void;
  onFileClear: () => void;
  enableImportBtn: () => void;
  disableImportBtn: () => void;
  onUploadComplete: (results: FileUploadGeoResults) => void;
  onUploadError: () => void;
}

let loadModulesPromise: Promise<LazyLoadedFileUploadModules>;

export interface LazyLoadedFileUploadModules {
  GeoUploadWizard: React.ComponentType<FileUploadComponentProps>;
  IndexNameForm: React.ComponentType<IndexNameFormProps>;
  importerFactory: (format: string, options: ImportFactoryOptions) => IImporter | undefined;
  getHttp: () => HttpStart;
}

export async function lazyLoadModules(): Promise<LazyLoadedFileUploadModules> {
  if (typeof loadModulesPromise !== 'undefined') {
    return loadModulesPromise;
  }

  loadModulesPromise = new Promise(async (resolve, reject) => {
    try {
      const { GeoUploadWizard, importerFactory, IndexNameForm } = await import('./lazy');
      resolve({
        GeoUploadWizard,
        importerFactory,
        getHttp,
        IndexNameForm,
      });
    } catch (error) {
      reject(error);
    }
  });
  return loadModulesPromise;
}
