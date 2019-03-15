/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { GCSRepository } from '../../../../../../../common/repository_types';
import { AppStateInterface, useAppState } from '../../../../../services/app_context';

import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';

interface Props {
  repository: GCSRepository;
}

export const GCSDetails = ({ repository }: Props) => {
  const [
    {
      core: {
        i18n: { FormattedMessage },
      },
    },
  ] = useAppState() as [AppStateInterface];
  const {
    settings: { bucket, client, base_path, compress, chunk_size },
  } = repository;

  const listItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.bucketLabel"
          defaultMessage="Bucket"
        />
      ),
      description: bucket,
    },
  ];

  if (client !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.clientLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.basePathLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.compressLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.chunkSizeLabel"
          defaultMessage="Chunk size"
        />
      ),
      description: String(chunk_size),
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
