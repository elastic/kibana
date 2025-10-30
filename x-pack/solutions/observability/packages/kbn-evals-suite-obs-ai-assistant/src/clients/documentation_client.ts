/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type {
  PerformInstallResponse,
  InstallationStatusResponse,
  UninstallResponse,
} from '@kbn/product-doc-base-plugin/common/http_api/installation';

const ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH = '/internal/product_doc_base/status';
const ELASTIC_DOCS_INSTALL_ALL_API_PATH = '/internal/product_doc_base/install';
const ELASTIC_DOCS_UNINSTALL_ALL_API_PATH = '/internal/product_doc_base/uninstall';

const inferenceId = defaultInferenceEndpoints.ELSER;

export class DocumentationClient {
  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  async ensureInstalled(): Promise<InstallationStatusResponse> {
    this.log.info(
      `GET ${ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH}?inferenceId=${inferenceId}&waitUntilComplete=true`
    );

    const status = await this.fetch<InstallationStatusResponse>(
      `${ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH}` + `?inferenceId=${inferenceId}`,
      { method: 'GET' }
    );

    if (status.overall === 'installed') {
      this.log.success('Elastic documentation is already installed');
      return status;
    }

    this.log.info('Installing Elastic documentation');

    const installResponse = await this.fetch<PerformInstallResponse>(
      ELASTIC_DOCS_INSTALL_ALL_API_PATH,
      {
        method: 'POST',
        body: JSON.stringify({ inferenceId }),
      }
    );

    if (!installResponse.installed) {
      this.log.error('Could not install Elastic documentation');
      throw new Error('Documentation did not install successfully before running tests.');
    }

    const installStatus = await this.fetch<InstallationStatusResponse>(
      ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH,
      {
        method: 'GET',
        query: {
          inferenceId,
        },
      }
    );
    if (installStatus.overall !== 'installed') {
      throw new Error('Documentation is not fully installed, cannot proceed with tests.');
    }
    return installStatus;
  }

  async uninstall() {
    this.log.info('Uninstalling Elastic documentation');
    const uninstallResponse = await this.fetch<UninstallResponse>(
      ELASTIC_DOCS_UNINSTALL_ALL_API_PATH,
      {
        method: 'POST',
        body: JSON.stringify({ inferenceId }),
      }
    );

    if (uninstallResponse.success) {
      this.log.success('Uninstalled Elastic documentation');
    } else {
      this.log.error('Could not uninstall Elastic documentation');
    }
  }
}
