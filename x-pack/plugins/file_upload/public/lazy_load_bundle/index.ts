/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureCollection } from 'geojson';
import React from 'react';
import type { HttpStart } from '../../../../../src/core/public/http/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { Props as IndexNameFormProps } from '../components/geojson_upload_form/index_name_form';
import type { IImporter, ImportFactoryOptions } from '../importer/types';
import { getHttp } from '../kibana_services';

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
  JsonUploadAndParse: React.ComponentType<FileUploadComponentProps>;
  IndexNameForm: React.ComponentType<IndexNameFormProps>;
  importerFactory: (format: string, options: ImportFactoryOptions) => IImporter | undefined;
  getHttp: () => HttpStart;
}

export async function lazyLoadModules(): Promise<LazyLoadedFileUploadModules> {
  if (typeof loadModulesPromise !== 'undefined') {
    return loadModulesPromise;
  }

  loadModulesPromise = new Promise(async (resolve) => {
    const { JsonUploadAndParse, importerFactory, IndexNameForm } = await import('./lazy');

    resolve({
      JsonUploadAndParse,
      importerFactory,
      getHttp,
      IndexNameForm,
    });
  });
  return loadModulesPromise;
}
