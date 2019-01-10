/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

type RedirectToHostDetailsProps = RouteComponentProps<{
  hostId?: string;
}>;

export const RedirectToHostsPage = ({
  match: {
    params: { hostId },
  },
  location,
}: RedirectToHostDetailsProps) => {
  return <Redirect to={hostId ? `/hosts/${hostId}` : '/hosts'} />;
};

export const getHostsUrl = (matches?: { hostId?: string }) => {
  return `#/link-to/hosts`;
};
