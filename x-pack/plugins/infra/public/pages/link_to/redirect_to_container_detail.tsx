/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { LoadingPage } from '../../components/loading_page';
import { WithSource } from '../../containers/with_source';

export const RedirectToContainerDetail = ({
  match,
  location,
}: RouteComponentProps<{ name: string }>) => (
  <WithSource>
    {({ configuredFields }) => {
      if (!configuredFields) {
        return <LoadingPage message="Loading container details" />;
      }

      return <Redirect to={`/metrics/container/${match.params.name}`} />;
    }}
  </WithSource>
);

export const getContainerDetailUrl = ({ name }: { name: string }) =>
  `#/link-to/container-detail/${name}`;
