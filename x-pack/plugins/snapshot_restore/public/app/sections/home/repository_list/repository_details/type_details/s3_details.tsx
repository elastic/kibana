/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { S3Repository } from '../../../../../../../common/types';
import { useAppDependencies } from '../../../../../index';

import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';

interface Props {
  repository: S3Repository;
}

export const S3Details: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const {
    settings: {
      bucket,
      client,
      base_path,
      compress,
      chunk_size,
      server_side_encryption,
      buffer_size,
      canned_acl,
      storage_class,
    },
  } = repository;

  const listItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.bucketLabel"
          defaultMessage="Bucket"
        />
      ),
      description: bucket || '',
    },
  ];

  if (client !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.clientLabel"
          defaultMessage="Client"
        />
      ),
      description: client,
    });
  }

  if (base_path !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.basePathLabel"
          defaultMessage="Base path"
        />
      ),
      description: base_path,
    });
  }

  if (compress !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.compressLabel"
          defaultMessage="Compress"
        />
      ),
      description: String(compress),
    });
  }

  if (chunk_size !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.chunkSizeLabel"
          defaultMessage="Chunk size"
        />
      ),
      description: String(chunk_size),
    });
  }

  if (server_side_encryption !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.serverSideEncryptionLabel"
          defaultMessage="Server-side encryption"
        />
      ),
      description: String(server_side_encryption),
    });
  }

  if (buffer_size !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.bufferSizeLabel"
          defaultMessage="Buffer size"
        />
      ),
      description: buffer_size,
    });
  }

  if (canned_acl !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.cannedAclLabel"
          defaultMessage="Canned ACL"
        />
      ),
      description: canned_acl,
    });
  }

  if (storage_class !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.storageClassLabel"
          defaultMessage="Storage class"
        />
      ),
      description: storage_class,
    });
  }

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryDetails.settingsTitle"
            defaultMessage="Settings"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiDescriptionList listItems={listItems} />
    </Fragment>
  );
};
