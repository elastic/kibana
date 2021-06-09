/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { StringOrNull } from '../../../..';

import aixLogo from './logos/aix.svg';
import androidLogo from './logos/android.svg';
import darwinLogo from './logos/darwin.svg';
import dragonflyLogo from './logos/dragonfly.svg';
import freebsdLogo from './logos/freebsd.svg';
import illumosLogo from './logos/illumos.svg';
import linuxLogo from './logos/linux.svg';
import solarisLogo from './logos/solaris.svg';
import netbsdLogo from './logos/netbsd.svg';

interface Props {
  name: StringOrNull;
  id: StringOrNull;
  provider: StringOrNull;
  platform: StringOrNull;
  timerange: { from: number; to: number };
}

export function HostLink({ name, id, provider, platform, timerange }: Props) {
  const providerLogo =
    provider === 'aws'
      ? 'logoAWS'
      : provider === 'gcp'
      ? 'logoGCP'
      : provider === 'azure'
      ? 'logoAzure'
      : 'compute';

  const platformLogo =
    platform === 'darwin'
      ? darwinLogo
      : platform === 'windows'
      ? 'logoWindows'
      : platform === 'linux'
      ? linuxLogo
      : platform === 'aix'
      ? aixLogo
      : platform === 'andriod'
      ? androidLogo
      : platform === 'dragonfly'
      ? dragonflyLogo
      : platform === 'illumos'
      ? illumosLogo
      : platform === 'freebsd'
      ? freebsdLogo
      : platform === 'solaris'
      ? solarisLogo
      : platform === 'netbsd'
      ? netbsdLogo
      : 'empty';
  const link = `../../app/metrics/link-to/host-detail/${id}?from=${timerange.from}&to=${timerange.to}`;
  return (
    <>
      {platformLogo !== null && <EuiIcon type={platformLogo} title={`${platform}`} />}
      &nbsp;
      {providerLogo !== null && <EuiIcon type={providerLogo} title={`${provider}`} />}
      &nbsp;
      <a href={link}>{name}</a>
    </>
  );
}
