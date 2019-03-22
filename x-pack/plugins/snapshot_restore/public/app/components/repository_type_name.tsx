/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { REPOSITORY_TYPES } from '../../../common/constants';
import { RepositoryType } from '../../../common/types';
import { useAppDependencies } from '../index';

interface Props {
  type: RepositoryType;
  delegateType?: RepositoryType;
}

export const RepositoryTypeName: React.FunctionComponent<Props> = ({ type, delegateType }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const typeNameMap: { [key in RepositoryType]: JSX.Element } = {
    [REPOSITORY_TYPES.fs]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.fileSystemTypeName"
        defaultMessage="Shared File System"
      />
    ),
    [REPOSITORY_TYPES.url]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.readonlyTypeName"
        defaultMessage="Read-only URL"
      />
    ),
    [REPOSITORY_TYPES.s3]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.s3TypeName"
        defaultMessage="AWS S3"
      />
    ),
    [REPOSITORY_TYPES.hdfs]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.hdfsTypeName"
        defaultMessage="HDFS File System"
      />
    ),
    [REPOSITORY_TYPES.azure]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.azureTypeName"
        defaultMessage="Azure"
      />
    ),
    [REPOSITORY_TYPES.gcs]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.gcsTypeName"
        defaultMessage="Google Cloud Storage"
      />
    ),
    [REPOSITORY_TYPES.source]: (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryType.sourceTypeName"
        defaultMessage="Source"
      />
    ),
  };

  const getTypeName = (repositoryType: RepositoryType): JSX.Element => {
    return typeNameMap[repositoryType] || <Fragment>{type}</Fragment>;
  };

  if (type === REPOSITORY_TYPES.source && delegateType) {
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
