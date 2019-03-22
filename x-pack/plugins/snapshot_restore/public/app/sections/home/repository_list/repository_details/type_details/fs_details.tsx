/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { FSRepository } from '../../../../../../../common/types';
import { useAppDependencies } from '../../../../../index';

import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';

interface Props {
  repository: FSRepository;
}

export const FSDetails: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const {
    settings: {
      location,
      compress,
      chunk_size,
      max_restore_bytes_per_sec,
      max_snapshot_bytes_per_sec,
      readonly,
    },
  } = repository;

  const listItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeFS.locationLabel"
          defaultMessage="Location"
        />
      ),
      description: location,
    },
  ];

  if (readonly !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeFS.readonlyLabel"
          defaultMessage="Readonly"
        />
      ),
      description: String(readonly),
    });
  }

  if (compress !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeFS.compressLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeFS.chunkSizeLabel"
          defaultMessage="Chunk size"
        />
      ),
      description: String(chunk_size),
    });
  }

  if (max_restore_bytes_per_sec !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeFS.maxRestoreBytesLabel"
          defaultMessage="Max restore bytes per second"
        />
      ),
      description: max_restore_bytes_per_sec,
    });
  }

  if (max_snapshot_bytes_per_sec !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeFS.maxSnapshotBytesLabel"
          defaultMessage="Max snapshot bytes per second"
        />
      ),
      description: max_snapshot_bytes_per_sec,
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
