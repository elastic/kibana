/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  AzureRepositoryType,
  FSRepositoryType,
  GCSRepositoryType,
  HDFSRepositoryType,
  ReadonlyRepositoryType,
  RepositoryType,
  S3RepositoryType,
  SourceRepositoryType,
} from '../../../common/repository_types';
import { AppStateInterface, useAppState } from '../services/app_context';

interface Props {
  type: RepositoryType;
  delegateType?: RepositoryType;
}

export const RepositoryTypeName = ({ type, delegateType }: Props) => {
  const [
    {
      core: {
        i18n: { FormattedMessage },
      },
    },
  ] = useAppState() as [AppStateInterface];

  const typeNameMap: { [key in RepositoryType]: JSX.Element } = {
    [FSRepositoryType]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.fileSystemTypeName"
        defaultMessage="Shared File System"
      />
    ),
    [ReadonlyRepositoryType]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.readonlyTypeName"
        defaultMessage="Read-only URL"
      />
    ),
    [S3RepositoryType]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.s3TypeName"
        defaultMessage="AWS S3"
      />
    ),
    [HDFSRepositoryType]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.hdfsTypeName"
        defaultMessage="HDFS File System"
      />
    ),
    [AzureRepositoryType]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.azureTypeName"
        defaultMessage="Azure"
      />
    ),
    [GCSRepositoryType]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.gcsTypeName"
        defaultMessage="Google Cloud Storage"
      />
    ),
    [SourceRepositoryType]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.sourceTypeName"
        defaultMessage="Source"
      />
    ),
  };

  const getTypeName = (repositoryType: RepositoryType): JSX.Element => {
    return typeNameMap[repositoryType] || <Fragment>{type}</Fragment>;
  };

  if (type === SourceRepositoryType && delegateType) {
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
