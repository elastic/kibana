/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { RepositoryType, RepositoryTypes } from '../../../common/types/repository_types';
import { useAppDependencies } from '../index';

interface Props {
  type: RepositoryType;
  delegateType?: RepositoryType;
}

export const RepositoryTypeName = ({ type, delegateType }: Props) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const typeNameMap: { [key in RepositoryType]: JSX.Element } = {
    [RepositoryTypes.fs]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.fileSystemTypeName"
        defaultMessage="Shared File System"
      />
    ),
    [RepositoryTypes.url]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.readonlyTypeName"
        defaultMessage="Read-only URL"
      />
    ),
    [RepositoryTypes.s3]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.s3TypeName"
        defaultMessage="AWS S3"
      />
    ),
    [RepositoryTypes.hdfs]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.hdfsTypeName"
        defaultMessage="HDFS File System"
      />
    ),
    [RepositoryTypes.azure]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.azureTypeName"
        defaultMessage="Azure"
      />
    ),
    [RepositoryTypes.gcs]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.gcsTypeName"
        defaultMessage="Google Cloud Storage"
      />
    ),
    [RepositoryTypes.source]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.sourceTypeName"
        defaultMessage="Source"
      />
    ),
  };

  const getTypeName = (repositoryType: RepositoryType): JSX.Element => {
    return typeNameMap[repositoryType] || <Fragment>{type}</Fragment>;
  };

  if (type === RepositoryTypes.source && delegateType) {
    return (
      <Fragment>
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryType.sourceTypeWithDelegateName"
          defaultMessage="Source ({delegateType})"
          values={{
            delegateType: getTypeName(delegateType),
          }}
        />
      </Fragment>
    );
  }

  return getTypeName(type);
};
