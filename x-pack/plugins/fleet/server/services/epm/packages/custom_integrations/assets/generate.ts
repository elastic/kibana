/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageDataStreamTypes } from '../../../../../../common/types';

import type { ArchivePackage } from '../../../../../../common';

import { pkgToPkgKey } from '../../../registry';

import { createAgentFields, createBaseFields, createDatasetManifest } from './dataset';
import { createDefaultPipeline } from './dataset/ingest_pipeline';
import { createManifest } from './manifest';

export type AssetOptions = ArchivePackage & {
  kibanaVersion: string;
  datasetNames: string[];
  datasetType: PackageDataStreamTypes;
};

// Mimic the use of an archive buffer via the same naming conventions
export const createAssets = (assetOptions: AssetOptions) => {
  const { name, version, datasetNames, datasetType } = assetOptions;
  return [
    {
      path: `${pkgToPkgKey({ name, version })}/manifest.yml`,
      content: Buffer.from(createManifest(assetOptions)),
    },
    ...datasetNames
      .map((dataset) => {
        return [
          {
            path: `${pkgToPkgKey({ name, version })}/data_stream/${dataset}/manifest.yml`,
            content: Buffer.from(createDatasetManifest(dataset, assetOptions)),
          },
          // NOTE: buildDefaultSettings() will add a reference to the global ILM policy when
          // building the index template based on the fields assets.
          {
            path: `${pkgToPkgKey({ name, version })}/data_stream/${dataset}/fields/base-fields.yml`,
            content: Buffer.from(createBaseFields()),
          },
          {
            path: `${pkgToPkgKey({ name, version })}/data_stream/${dataset}/fields/agent.yml`,
            content: Buffer.from(createAgentFields()),
          },
          {
            path: `${pkgToPkgKey({
              name,
              version,
            })}/data_stream/${dataset}/elasticsearch/ingest_pipeline/default.yml`,
            content: Buffer.from(createDefaultPipeline(dataset, datasetType)),
          },
        ];
      })
      .flat(),
  ];
};
