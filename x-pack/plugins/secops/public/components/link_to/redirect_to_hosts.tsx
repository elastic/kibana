/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

type RedirectToHostDetailsProps = RouteComponentProps<{
  hostName?: string;
}>;

export const RedirectToHostsPage = ({
  match: {
    params: { hostName },
  },
  location,
}: RedirectToHostDetailsProps) => {
  return <Redirect to={hostName ? `/hosts/${hostName}` : '/hosts'} />;
};

export const getHostsUrl = (matches?: { hostName?: string }) => {
  return `#/link-to/hosts`;
};
