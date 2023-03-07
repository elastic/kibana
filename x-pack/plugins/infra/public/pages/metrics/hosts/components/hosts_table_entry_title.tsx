/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiToolTip, IconType } from '@elastic/eui';
import { TimeRange } from '@kbn/es-query';
import { useLinkProps } from '@kbn/observability-plugin/public';
import { encode } from '@kbn/rison';
import type { CloudProvider, HostNodeRow } from '../hooks/use_hosts_table';

const cloudIcons: Record<CloudProvider, IconType> = {
  gcp: 'logoGCP',
  aws: 'logoAWS',
  azure: 'logoAzure',
  unknownProvider: 'cloudSunny',
};

interface HostsTableEntryTitleProps {
  onClick: () => void;
  time: TimeRange;
  title: HostNodeRow['title'];
}

export const HostsTableEntryTitle = ({ onClick, time, title }: HostsTableEntryTitleProps) => {
  const { name, cloudProvider } = title;

  const link = useLinkProps({
    app: 'metrics',
    pathname: `/detail/host/${name}`,
    search: {
      _a: encode({ time: { ...time, interval: '>=1m' } }),
    },
  });

  const iconType = (cloudProvider && cloudIcons[cloudProvider]) || cloudIcons.unknownProvider;
  const providerName = cloudProvider ?? 'Unknown';

  return (
    <EuiFlexGroup
      alignItems="center"
      className="eui-textTruncate"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip delay="long" content={providerName}>
          <EuiIcon type={iconType} size="m" title={name} />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false} className="eui-textTruncate" onClick={onClick}>
        <EuiToolTip delay="long" content={name}>
          <EuiLink className="eui-displayBlock eui-textTruncate" {...link}>
            {name}
          </EuiLink>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
