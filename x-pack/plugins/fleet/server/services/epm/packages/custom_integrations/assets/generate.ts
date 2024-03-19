/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArchivePackage } from '../../../../../../common';

import { pkgToPkgKey } from '../../../registry';

import type { CustomPackageDatasetConfiguration } from '../../install';

import { createBaseFields, createDatasetManifest } from './dataset';
import { createDefaultPipeline } from './dataset/ingest_pipeline';
import { createManifest } from './manifest';

export type AssetOptions = ArchivePackage & {
  kibanaVersion: string;
  datasets: CustomPackageDatasetConfiguration[];
};

// Mimic the use of an archive buffer via the same naming conventions
export const createAssets = (assetOptions: AssetOptions) => {
  const { name, version, datasets } = assetOptions;
  return [
    {
      path: `${pkgToPkgKey({ name, version })}/manifest.yml`,
      content: Buffer.from(createManifest(assetOptions)),
    },
    ...datasets
      .map((datasetConfiguration) => {
        const { name: datasetName, type: datasetType } = datasetConfiguration;
        return [
          {
            path: `${pkgToPkgKey({ name, version })}/data_stream/${datasetName}/manifest.yml`,
            content: Buffer.from(createDatasetManifest(datasetName, assetOptions)),
          },
          // NOTE: buildDefaultSettings() will add a reference to the global ILM policy when
          // building the index template based on the fields assets.
          {
            path: `${pkgToPkgKey({
              name,
              version,
            })}/data_stream/${datasetName}/fields/base-fields.yml`,
            content: Buffer.from(createBaseFields()),
          },
          {
            path: `${pkgToPkgKey({
              name,
              version,
            })}/data_stream/${datasetName}/elasticsearch/ingest_pipeline/default.yml`,
            content: Buffer.from(createDefaultPipeline(datasetName, datasetType)),
          },
        ];
      })
      .flat(),
  ];
};
