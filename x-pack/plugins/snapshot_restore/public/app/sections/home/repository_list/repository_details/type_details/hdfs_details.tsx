/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { HDFSRepository } from '../../../../../../../common/repository_types';
import { AppStateInterface, useStateValue } from '../../../../../services/app_context';

import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';

interface Props {
  repository: HDFSRepository;
}

export const HDFSDetails = ({ repository }: Props) => {
  const [
    {
      core: {
        i18n: { FormattedMessage },
      },
    },
  ] = useStateValue() as [AppStateInterface];
  const { settings } = repository;
  const {
    uri,
    path,
    load_defaults,
    compress,
    chunk_size,
    'security.principal': securityPrincipal,
    ...rest
  } = settings;

  const listItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeHDFS.uriLabel"
          defaultMessage="URI"
        />
      ),
      description: uri,
    },
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeHDFS.pathLabel"
          defaultMessage="Path"
        />
      ),
      description: path,
    },
  ];

  if (load_defaults !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeHDFS.loadDefaultsLabel"
          defaultMessage="Load defaults"
        />
      ),
      description: String(load_defaults),
    });
  }

  if (compress !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeHDFS.compressLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeHDFS.chunkSizeLabel"
          defaultMessage="Chunk size"
        />
      ),
      description: String(chunk_size),
    });
  }

  if (securityPrincipal !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeHDFS.securityPrincipalLabel"
          defaultMessage="Security principal"
        />
      ),
      description: securityPrincipal,
    });
  }

  Object.keys(rest).forEach(key => {
    listItems.push({
      title: <Fragment>{key}</Fragment>,
      description: String(settings[key]),
    });
  });

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
