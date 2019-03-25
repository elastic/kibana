/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/elasticsearch/snapshot_restore';
export type Section = 'repositories' | 'snapshots';

export enum REPOSITORY_DOC_PATHS {
  default = 'modules-snapshots.html',
  fs = 'modules-snapshots.html#_shared_file_system_repository',
  url = 'modules-snapshots.html#_read_only_url_repository',
  source = 'modules-snapshots.html#_source_only_repository',
  s3 = 'repository-s3.html',
  hdfs = 'repository-hdfs.html',
  azure = 'repository-azure.html',
  gcs = 'repository-gcs.html',
}

export const getHomeBreadcrumb = (translate: any) => {
  return {
    text: translate('xpack.snapshotRestore.home.breadcrumbTitle', {
      defaultMessage: 'Snapshot and Restore',
    }),
    href: `#${BASE_PATH}`,
  };
};

export const getRepositoryAddBreadcrumb = (translate: any) => {
  return {
    text: translate('xpack.snapshotRestore.addRepository.breadcrumbTitle', {
      defaultMessage: 'Add repository',
    }),
    href: `#${BASE_PATH}/repositories/add`,
  };
};
