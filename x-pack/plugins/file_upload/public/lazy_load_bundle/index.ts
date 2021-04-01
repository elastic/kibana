/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FeatureCollection } from 'geojson';
import { IndexPattern } from 'src/plugins/data/public';
import { HttpStart } from 'src/core/public';
import { IImporter, ImportFactoryOptions, ImportResults } from '../importer';
import { getHttp } from '../kibana_services';

export interface FileUploadComponentProps {
  isIndexingTriggered: boolean;
  onFileUpload: (geojsonFile: FeatureCollection, name: string, previewCoverage: number) => void;
  onFileRemove: () => void;
  onIndexReady: (indexReady: boolean) => void;
  onIndexingComplete: (results: {
    indexDataResp: ImportResults;
    indexPattern: IndexPattern;
  }) => void;
  onIndexingError: () => void;
}

let loadModulesPromise: Promise<LazyLoadedFileUploadModules>;

interface LazyLoadedFileUploadModules {
  JsonUploadAndParse: React.ComponentType<FileUploadComponentProps>;
  importerFactory: (format: string, options: ImportFactoryOptions) => IImporter | undefined;
  getHttp: () => HttpStart;
}

export async function lazyLoadFileUploadModules(): Promise<LazyLoadedFileUploadModules> {
  if (typeof loadModulesPromise !== 'undefined') {
    return loadModulesPromise;
  }

  loadModulesPromise = new Promise(async (resolve) => {
    const { JsonUploadAndParse, importerFactory } = await import('./lazy');

    resolve({
      JsonUploadAndParse,
      importerFactory,
      getHttp,
    });
  });
  return loadModulesPromise;
}
