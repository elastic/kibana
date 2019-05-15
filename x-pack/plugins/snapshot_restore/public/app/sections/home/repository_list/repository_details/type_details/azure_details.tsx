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
    settings: {
      client,
      container,
      basePath,
      compress,
      chunkSize,
      readonly,
      locationMode,
      maxRestoreBytesPerSec,
      maxSnapshotBytesPerSec,
    },
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

  if (basePath !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.basePathLabel"
          defaultMessage="Base path"
        />
      ),
      description: basePath,
    });
  }

  if (compress !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.compressLabel"
          defaultMessage="Snapshot compression"
        />
      ),
      description: String(compress),
    });
  }

  if (chunkSize !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.chunkSizeLabel"
          defaultMessage="Chunk size"
        />
      ),
      description: String(chunkSize),
    });
  }

  if (maxSnapshotBytesPerSec !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.maxSnapshotBytesLabel"
          defaultMessage="Max snapshot bytes per second"
        />
      ),
      description: maxSnapshotBytesPerSec,
    });
  }

  if (maxRestoreBytesPerSec !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.maxRestoreBytesLabel"
          defaultMessage="Max restore bytes per second"
        />
      ),
      description: maxRestoreBytesPerSec,
    });
  }

  if (readonly !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.readonlyLabel"
          defaultMessage="Read-only"
        />
      ),
      description: String(readonly),
    });
  }

  if (locationMode !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeAzure.locationModeLabel"
          defaultMessage="Location mode"
        />
      ),
      description: locationMode,
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
