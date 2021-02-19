/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { StringOrNull } from '../../../..';

interface Props {
  name: StringOrNull;
  id: StringOrNull;
  provider: StringOrNull;
  platform: StringOrNull;
  timerange: { from: number; to: number };
}

export function HostLink({ name, id, provider, timerange }: Props) {
  const providerLogo =
    provider === 'aws'
      ? 'logoAWS'
      : provider === 'gcp'
      ? 'logoGCP'
      : provider === 'azure'
      ? 'logoAzure'
      : 'compute';

  const link = `../../app/metrics/link-to/host-detail/${id}?from=${timerange.from}&to=${timerange.to}`;
  return (
    <>
      {providerLogo !== null && <EuiIcon type={providerLogo} />}
      &nbsp;
      <a href={link}>{name}</a>
    </>
  );
}
