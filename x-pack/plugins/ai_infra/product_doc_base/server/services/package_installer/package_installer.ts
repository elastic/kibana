/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  getArtifactName,
  getProductDocIndexName,
  DocumentationProduct,
  type ProductName,
} from '@kbn/product-doc-common';
import type { ProductDocInstallClient } from '../doc_install_status';
import type { InferenceEndpointManager } from '../inference_endpoint';
import {
  downloadToDisk,
  openZipArchive,
  loadManifestFile,
  loadMappingFile,
  type ZipArchive,
} from './utils';
import { majorMinor, latestVersion } from './utils/semver';
import {
  validateArtifactArchive,
  fetchArtifactVersions,
  createIndex,
  populateIndex,
} from './steps';

interface PackageInstallerOpts {
  artifactsFolder: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  productDocClient: ProductDocInstallClient;
  endpointManager: InferenceEndpointManager;
  artifactRepositoryUrl: string;
  kibanaVersion: string;
}

export class PackageInstaller {
  private readonly log: Logger;
  private readonly artifactsFolder: string;
  private readonly esClient: ElasticsearchClient;
  private readonly productDocClient: ProductDocInstallClient;
  private readonly endpointManager: InferenceEndpointManager;
  private readonly artifactRepositoryUrl: string;
  private readonly currentVersion: string;

  constructor({
    artifactsFolder,
    logger,
    esClient,
    productDocClient,
    endpointManager,
    artifactRepositoryUrl,
    kibanaVersion,
  }: PackageInstallerOpts) {
    this.esClient = esClient;
    this.productDocClient = productDocClient;
    this.artifactsFolder = artifactsFolder;
    this.endpointManager = endpointManager;
    this.artifactRepositoryUrl = artifactRepositoryUrl;
    this.currentVersion = majorMinor(kibanaVersion);
    this.log = logger;
  }

  async installAll({}: {}) {
    const artifactVersions = await fetchArtifactVersions({
      artifactRepositoryUrl: this.artifactRepositoryUrl,
    });
    const allProducts = Object.values(DocumentationProduct) as ProductName[];
    for (const productName of allProducts) {
      const availableVersions = artifactVersions[productName];
      if (!availableVersions || !availableVersions.length) {
        this.log.warn(`No version found for product [${productName}]`);
        continue;
      }
      const selectedVersion = availableVersions.includes(this.currentVersion)
        ? this.currentVersion
        : latestVersion(availableVersions);

      await this.installPackage({
        productName,
        productVersion: selectedVersion,
      });
    }
  }

  async installPackage({
    productName,
    productVersion,
  }: {
    productName: ProductName;
    productVersion: string;
  }) {
    this.log.info(
      `Starting installing documentation for product [${productName}] and version [${productVersion}]`
    );

    await this.uninstallPackage({ productName });

    let zipArchive: ZipArchive | undefined;
    try {
      await this.productDocClient.setInstallationStarted({
        productName,
        productVersion,
      });

      await this.endpointManager.ensureInternalElserInstalled();

      const artifactFileName = getArtifactName({ productName, productVersion });
      const artifactUrl = `${this.artifactRepositoryUrl}/${artifactFileName}`;
      const artifactPath = `${this.artifactsFolder}/${artifactFileName}`;

      this.log.debug(`Downloading from [${artifactUrl}] to [${artifactPath}]`);
      await downloadToDisk(artifactUrl, artifactPath);

      zipArchive = await openZipArchive(artifactPath);

      validateArtifactArchive(zipArchive);

      const manifest = await loadManifestFile(zipArchive);
      const mappings = await loadMappingFile(zipArchive);

      const indexName = getProductDocIndexName(productName);

      await createIndex({
        indexName,
        mappings,
        esClient: this.esClient,
        log: this.log,
      });

      await populateIndex({
        indexName,
        archive: zipArchive,
        esClient: this.esClient,
        log: this.log,
      });
      await this.productDocClient.setInstallationSuccessful(productName, indexName);

      this.log.info(
        `Documentation installation successful for product [${productName}] and version [${productVersion}]`
      );
    } catch (e) {
      this.log.error(
        `Error during documentation installation of product [${productName}]/[${productVersion}] : ${e.message}`
      );

      await this.productDocClient.setInstallationFailed(productName, e.message);
      throw e;
    } finally {
      if (zipArchive) {
        zipArchive.close();
      }
    }
  }

  async uninstallPackage({ productName }: { productName: ProductName }) {
    const indexName = getProductDocIndexName(productName);
    await this.esClient.indices.delete(
      {
        index: indexName,
      },
      { ignore: [404] }
    );

    await this.productDocClient.setUninstalled(productName);
  }
}
