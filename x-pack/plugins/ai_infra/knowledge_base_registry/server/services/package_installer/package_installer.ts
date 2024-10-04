/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import Fs from 'fs';
import Path from 'path';
import { getDataPath } from '@kbn/utils';
import { Logger } from '@kbn/logging';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ProductDocInstallClient } from '../../dao/product_doc_install';
import type { InferenceEndpointManager } from '../inference_endpoint';
import {
  downloadToDisk,
  openZipArchive,
  validateArtifactArchive,
  loadManifestFile,
  loadMappingFile,
} from './utils';
import { createIndex, populateIndex } from './steps';

interface PackageInstallerOpts {
  artifactsFolder: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  productDocClient: ProductDocInstallClient;
  endpointManager: InferenceEndpointManager;
  artifactRepositoryUrl: string;
}

export class PackageInstaller {
  private readonly logger: Logger;
  private readonly artifactsFolder: string;
  private readonly esClient: ElasticsearchClient;
  private readonly productDocClient: ProductDocInstallClient;
  private readonly endpointManager: InferenceEndpointManager;
  private readonly artifactRepositoryUrl: string;

  constructor({
    artifactsFolder,
    logger,
    esClient,
    productDocClient,
    endpointManager,
    artifactRepositoryUrl,
  }: PackageInstallerOpts) {
    this.esClient = esClient;
    this.productDocClient = productDocClient;
    this.artifactsFolder = artifactsFolder;
    this.endpointManager = endpointManager;
    this.artifactRepositoryUrl = artifactRepositoryUrl;
    this.logger = logger;
  }

  async installPackage({
    productName,
    productVersion,
  }: {
    productName: string;
    productVersion: string;
  }) {
    // TODO: uninstall previous/current if present
    await this.uninstallPackage({
      productName,
      productVersion,
    });

    await this.endpointManager.ensureInternalElserInstalled();

    const artifactFileName = getArtifactName({ productName, productVersion });
    const artifactUrl = `${this.artifactRepositoryUrl}/${artifactFileName}`;
    const artifactPath = `${this.artifactsFolder}/${artifactFileName}`;

    console.log(`*** downloading ${artifactUrl} to ${artifactPath}`);

    await downloadToDisk(artifactUrl, artifactPath);

    const zipArchive = await openZipArchive(artifactPath);
    try {
      const manifest = await loadManifestFile(zipArchive);
      const mappings = await loadMappingFile(zipArchive);

      const indexName = getIndexName({ productName, productVersion });

      await createIndex({
        indexName,
        mappings,
        esClient: this.esClient,
        log: this.logger,
      });

      await populateIndex({
        indexName,
        archive: zipArchive,
        esClient: this.esClient,
        log: this.logger,
      });

      // TODO: update the product_doc_install SO
    } finally {
      zipArchive.close();
    }
  }

  async uninstallPackage({
    productName,
    productVersion,
  }: {
    productName: string;
    productVersion: string;
  }) {
    // TODO

    const indexName = getIndexName({ productName, productVersion });
    await this.esClient.indices.delete(
      {
        index: indexName,
      },
      { ignore: [404] }
    );
  }
}

// need to be factorized with the script
const getArtifactName = ({
  productName,
  productVersion,
}: {
  productName: string;
  productVersion: string;
}): string => {
  return `kibana-kb-${productName}-${productVersion}.zip`.toLowerCase();
};

const getIndexName = ({
  productName,
  productVersion,
}: {
  productName: string;
  productVersion: string;
}): string => {
  return `.kibana-ai-kb-${productName}-${productVersion}`.toLowerCase();
};
