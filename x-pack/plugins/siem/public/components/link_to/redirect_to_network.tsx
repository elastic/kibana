/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

export type NetworkComponentProps = RouteComponentProps<{
  ip: string;
}>;

export const RedirectToNetworkPage = ({
  match: {
    params: { ip },
  },
}: NetworkComponentProps) => <Redirect to={ip ? `/network/ip/${ip}` : '/network'} />;

export const getNetworkUrl = () => '#/link-to/network';
