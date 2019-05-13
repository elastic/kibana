/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { REPOSITORY_TYPES } from '../../../../common/constants';

class TextService {
  public breadcrumbs: { [key: string]: string } = {};
  public i18n: any;
  private repositoryTypeNames: { [key: string]: string } = {};

  public init(i18n: any): void {
    this.i18n = i18n;
    this.repositoryTypeNames = {
      [REPOSITORY_TYPES.fs]: i18n.translate(
        'xpack.snapshotRestore.repositoryType.fileSystemTypeName',
        {
          defaultMessage: 'Shared file system',
        }
      ),
      [REPOSITORY_TYPES.url]: i18n.translate(
        'xpack.snapshotRestore.repositoryType.readonlyTypeName',
        {
          defaultMessage: 'Read-only URL',
        }
      ),
      [REPOSITORY_TYPES.s3]: i18n.translate('xpack.snapshotRestore.repositoryType.s3TypeName', {
        defaultMessage: 'AWS S3',
      }),
      [REPOSITORY_TYPES.hdfs]: i18n.translate('xpack.snapshotRestore.repositoryType.hdfsTypeName', {
        defaultMessage: 'Hadoop HDFS',
      }),
      [REPOSITORY_TYPES.azure]: i18n.translate(
        'xpack.snapshotRestore.repositoryType.azureTypeName',
        {
          defaultMessage: 'Azure',
        }
      ),
      [REPOSITORY_TYPES.gcs]: i18n.translate('xpack.snapshotRestore.repositoryType.gcsTypeName', {
        defaultMessage: 'Google Cloud Storage',
      }),
      [REPOSITORY_TYPES.source]: i18n.translate(
        'xpack.snapshotRestore.repositoryType.sourceTypeName',
        {
          defaultMessage: 'Source-only',
        }
      ),
    };
    this.breadcrumbs = {
      home: i18n.translate('xpack.snapshotRestore.home.breadcrumbTitle', {
        defaultMessage: 'Snapshot Repositories',
      }),
      repositoryAdd: i18n.translate('xpack.snapshotRestore.addRepository.breadcrumbTitle', {
        defaultMessage: 'Add repository',
      }),
      repositoryEdit: i18n.translate('xpack.snapshotRestore.editRepository.breadcrumbTitle', {
        defaultMessage: 'Edit repository',
      }),
    };
  }

  public getRepositoryTypeName(type: string, delegateType?: string) {
    const getTypeName = (repositoryType: string): string => {
      return this.repositoryTypeNames[repositoryType] || type || '';
    };

    if (type === REPOSITORY_TYPES.source && delegateType) {
      return this.i18n.translate(
        'xpack.snapshotRestore.repositoryType.sourceTypeWithDelegateName',
        {
          defaultMessage: '{delegateType} (Source-only)',
          values: {
            delegateType: getTypeName(delegateType),
          },
        }
      );
    }

    return getTypeName(type);
  }

  public getSizeNotationHelpText() {
    return this.i18n.translate('xpack.snapshotRestore.repositoryForm.sizeNotationPlaceholder', {
      defaultMessage: 'Examples: {example1}, {example2}, {example3}, {example4}',
      values: {
        example1: '1g',
        example2: '10mb',
        example3: '5k',
        example4: '1024B',
      },
    });
  }
}

export const textService = new TextService();
