/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { REPOSITORY_TYPES } from '../../../common/constants';
import { RepositoryType } from '../../../common/types';
import { useAppDependencies } from '../index';

interface Props {
  type: RepositoryType;
  delegateType?: RepositoryType;
}

export const RepositoryTypeName: React.FunctionComponent<Props> = ({ type, delegateType }) => {
  const {
    core: { i18n },
  } = useAppDependencies();

  const typeNameMap: { [key in RepositoryType]: string } = {
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
    [REPOSITORY_TYPES.azure]: i18n.translate('xpack.snapshotRestore.repositoryType.azureTypeName', {
      defaultMessage: 'Azure',
    }),
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

  const getTypeName = (repositoryType: RepositoryType): string => {
    return typeNameMap[repositoryType] || type || '';
  };

  if (type === REPOSITORY_TYPES.source && delegateType) {
    return i18n.translate('xpack.snapshotRestore.repositoryType.sourceTypeWithDelegateName', {
      defaultMessage: 'Source ({delegateType})',
      values: {
        delegateType: getTypeName(delegateType),
      },
    });
  }

  return getTypeName(type);
};
