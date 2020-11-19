/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DocLinksStart } from '../../../../../../../src/core/public';
import { REPOSITORY_TYPES } from '../../../../common/constants';
import { RepositoryType } from '../../../../common/types';
import { REPOSITORY_DOC_PATHS } from '../../constants';

class DocumentationLinksService {
  private esDocBasePath: string = '';
  private esPluginDocBasePath: string = '';

  public setup(docLinks: DocLinksStart): void {
    const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = docLinks;
    const docsBase = `${ELASTIC_WEBSITE_URL}guide/en`;

    this.esDocBasePath = `${docsBase}/elasticsearch/reference/${DOC_LINK_VERSION}/`;
    this.esPluginDocBasePath = `${docsBase}/elasticsearch/plugins/${DOC_LINK_VERSION}/`;
  }

  public getRepositoryPluginDocUrl() {
    return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.plugins}`;
  }

  public getRepositoryTypeDocUrl(type?: RepositoryType) {
    switch (type) {
      case REPOSITORY_TYPES.fs:
        return `${this.esDocBasePath}${REPOSITORY_DOC_PATHS.fs}`;
      case REPOSITORY_TYPES.url:
        return `${this.esDocBasePath}${REPOSITORY_DOC_PATHS.url}`;
      case REPOSITORY_TYPES.source:
        return `${this.esDocBasePath}${REPOSITORY_DOC_PATHS.source}`;
      case REPOSITORY_TYPES.s3:
        return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.s3}`;
      case REPOSITORY_TYPES.hdfs:
        return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.hdfs}`;
      case REPOSITORY_TYPES.azure:
        return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.azure}`;
      case REPOSITORY_TYPES.gcs:
        return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.gcs}`;
      default:
        return `${this.esDocBasePath}${REPOSITORY_DOC_PATHS.default}`;
    }
  }

  public getSnapshotDocUrl() {
    return `${this.esDocBasePath}snapshots-take-snapshot.html`;
  }

  public getRestoreDocUrl() {
    return `${this.esDocBasePath}snapshots-restore-snapshot.html`;
  }

  public getRestoreIndexSettingsUrl() {
    return `${this.esDocBasePath}snapshots-restore-snapshot.html#_changing_index_settings_during_restore`;
  }

  public getIndexSettingsUrl() {
    return `${this.esDocBasePath}index-modules.html`;
  }

  public getDateMathIndexNamesUrl() {
    return `${this.esDocBasePath}date-math-index-names.html`;
  }

  public getSlmUrl() {
    return `${this.esDocBasePath}slm-api-put.html`;
  }

  public getCronUrl() {
    return `${this.esDocBasePath}trigger-schedule.html#schedule-cron`;
  }
}

export const documentationLinksService = new DocumentationLinksService();
