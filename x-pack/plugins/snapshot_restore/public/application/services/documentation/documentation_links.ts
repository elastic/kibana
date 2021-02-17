/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from '../../../../../../../src/core/public';
import { REPOSITORY_TYPES } from '../../../../common/constants';
import { RepositoryType } from '../../../../common/types';

class DocumentationLinksService {
  private pluginLink: string = '';
  private fsLink: string = '';
  private urlLink: string = '';
  private sourceLink: string = '';
  private s3Link: string = '';
  private hdfsLink: string = '';
  private azureLink: string = '';
  private gcsLink: string = '';
  private defaultLink: string = '';
  private createSnapshotLink: string = '';
  private restoreSnapshotLink: string = '';
  private indexSettingsLink: string = '';
  private indexModulesLink: string = '';
  private dateMathLink: string = '';
  private slmLink: string = '';
  private cronLink: string = '';
  public setup(docLinks: DocLinksStart): void {
    this.pluginLink = `${docLinks.links.plugins.snapshotRestoreRepos}`;
    this.fsLink = `${docLinks.links.snapshotRestore.registerSharedFileSystem}`;
    this.urlLink = `${docLinks.links.snapshotRestore.registerUrl}`;
    this.sourceLink = `${docLinks.links.snapshotRestore.registerSourceOnly}`;
    this.s3Link = `${docLinks.links.plugins.s3Repo}`;
    this.hdfsLink = `${docLinks.links.plugins.hdfsRepo}`;
    this.azureLink = `${docLinks.links.plugins.azureRepo}`;
    this.gcsLink = `${docLinks.links.plugins.gcsRepo}`;
    this.defaultLink = `${docLinks.links.snapshotRestore.guide}`;
    this.createSnapshotLink = `${docLinks.links.snapshotRestore.createSnapshot}`;
    this.restoreSnapshotLink = `${docLinks.links.snapshotRestore.restoreSnapshot}`;
    this.indexSettingsLink = `${docLinks.links.snapshotRestore.changeIndexSettings}`;
    this.indexModulesLink = `${docLinks.links.elasticsearch.indexModules}`;
    this.dateMathLink = `${docLinks.links.elasticsearch.dateMathIndexNames}`;
    this.slmLink = `${docLinks.links.apis.putSnapshotLifecyclePolicy}`;
    this.cronLink = `${docLinks.links.watcher.cronSchedule}`;
  }

  public getRepositoryPluginDocUrl() {
    return `${this.pluginLink}`;
  }

  public getRepositoryTypeDocUrl(type?: RepositoryType) {
    switch (type) {
      case REPOSITORY_TYPES.fs:
        return `${this.fsLink}`;
      case REPOSITORY_TYPES.url:
        return `${this.urlLink}`;
      case REPOSITORY_TYPES.source:
        return `${this.sourceLink}`;
      case REPOSITORY_TYPES.s3:
        return `${this.s3Link}`;
      case REPOSITORY_TYPES.hdfs:
        return `${this.hdfsLink}`;
      case REPOSITORY_TYPES.azure:
        return `${this.azureLink}`;
      case REPOSITORY_TYPES.gcs:
        return `${this.gcsLink}`;
      default:
        return `${this.defaultLink}`;
    }
  }

  public getSnapshotDocUrl() {
    return `${this.createSnapshotLink}`;
  }

  public getRestoreDocUrl() {
    return `${this.restoreSnapshotLink}`;
  }

  public getRestoreIndexSettingsUrl() {
    return `${this.indexSettingsLink}`;
  }

  public getIndexSettingsUrl() {
    return `${this.indexModulesLink}`;
  }

  public getDateMathIndexNamesUrl() {
    return `${this.dateMathLink}`;
  }

  public getSlmUrl() {
    return `${this.slmLink}`;
  }

  public getCronUrl() {
    return `${this.cronLink}`;
  }
}

export const documentationLinksService = new DocumentationLinksService();
