/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { AzureRepository } from '../../../../../../../common/types';
import { useAppDependencies } from '../../../../../index';

interface Props {
  repository: AzureRepository;
}

export const AzureDetails: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const {
    settings: { client, container, base_path, compress, chunk_size, readonly, location_mode },
  } = repository;

  const listItems = [];

  if (client !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.clientLabel"
          defaultMessage="Client"
        />
      ),
      description: client,
    });
  }

  if (container !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.containerLabel"
          defaultMessage="Container"
        />
      ),
      description: container,
    });
  }

  if (base_path !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.basePathLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.compressLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.chunkSizeLabel"
          defaultMessage="Chunk size"
        />
      ),
      description: String(chunk_size),
    });
  }

  if (readonly !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.readonlyLabel"
          defaultMessage="Readonly"
        />
      ),
      description: String(readonly),
    });
  }

  if (location_mode !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.locationModeLabel"
          defaultMessage="Location mode"
        />
      ),
      description: location_mode,
    });
  }

  if (!listItems.length) {
    return null;
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
