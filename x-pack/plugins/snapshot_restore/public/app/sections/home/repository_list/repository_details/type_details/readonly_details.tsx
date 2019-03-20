/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { ReadonlyRepository } from '../../../../../../../common/types/repository_types';
import { AppStateInterface, useAppState } from '../../../../../services/app_context';

import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';

interface Props {
  repository: ReadonlyRepository;
}

export const ReadonlyDetails = ({ repository }: Props) => {
  const [
    {
      core: {
        i18n: { FormattedMessage },
      },
    },
  ] = useAppState() as [AppStateInterface];
  const {
    settings: { url },
  } = repository;

  const listItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeReadonly.urlLabel"
          defaultMessage="URL"
        />
      ),
      description: url,
    },
  ];

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
