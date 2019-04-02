/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { REPOSITORY_TYPES } from '../../../../common/constants';
import { RepositoryType } from '../../../../common/types';

class TextService {
  private i18n: any;
  private repositoryTypeNameMap: { [key in RepositoryType]: string } = {};

  public init(i18n: any): void {
    this.i18n = i18n;
    this.repositoryTypeNameMap = {
      [REPOSITORY_TYPES.fs]: i18n.translate(
        'xpack.snapshotRestore.repositoryType.fileSystemTypeName',
        {
          defaultMessage: 'Shared File System',
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
          defaultMessage: 'Source',
        }
      ),
    };
  }

  public getRepositoryTypeName(type: RepositoryType, delegateType?: RepositoryType) {
    const getTypeName = (repositoryType: RepositoryType): string => {
      return this.repositoryTypeNameMap[repositoryType] || type || '';
    };

    if (type === REPOSITORY_TYPES.source && delegateType) {
      return this.i18n.translate(
        'xpack.snapshotRestore.repositoryType.sourceTypeWithDelegateName',
        {
          defaultMessage: 'Source ({delegateType})',
          values: {
            delegateType: getTypeName(delegateType),
          },
        }
      );
    }

    return getTypeName(type);
  }
}

export const textService = new TextService();
