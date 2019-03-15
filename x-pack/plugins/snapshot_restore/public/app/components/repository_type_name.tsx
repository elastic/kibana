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
  RepostitoryType,
  S3RepositoryType,
  SourceRepositoryType,
} from '../../../common/repository_types';
import { AppStateInterface, useStateValue } from '../services/app_context';

interface Props {
  type: RepostitoryType;
  delegateType?: RepostitoryType;
}

export const RepositoryTypeName = ({ type, delegateType }: Props) => {
  const [
    {
      core: {
        i18n: { FormattedMessage },
      },
    },
  ] = useStateValue() as [AppStateInterface];

  const getTypeName = (repositoryType: RepostitoryType): JSX.Element => {
    switch (repositoryType) {
      case FSRepositoryType:
        return (
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryType.fileSystemTypeName"
            defaultMessage="File System"
          />
        );
        break;
      case ReadonlyRepositoryType:
        return (
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryType.readonlyTypeName"
            defaultMessage="Read-only"
          />
        );
        break;
      case S3RepositoryType:
        return (
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryType.s3TypeName"
            defaultMessage="AWS S3"
          />
        );
        break;
      case HDFSRepositoryType:
        return (
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryType.hdfsTypeName"
            defaultMessage="HDFS File System"
          />
        );
        break;
      case AzureRepositoryType:
        return (
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryType.azureTypeName"
            defaultMessage="Azure"
          />
        );
        break;
      case GCSRepositoryType:
        return (
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryType.gcsTypeName"
            defaultMessage="Google Cloud Storage"
          />
        );
        break;
      case SourceRepositoryType:
        return (
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryType.sourceTypeName"
            defaultMessage="Source"
          />
        );
        break;
      default:
        return <Fragment>{type}</Fragment>;
        break;
    }
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
