/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiToolTip, IconType } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { getNodeDetailUrl } from '../../../../link_to';
import type { CloudProvider, HostNodeRow } from '../../hooks/use_hosts_table';

const cloudIcons: Record<CloudProvider, IconType> = {
  gcp: 'logoGCP',
  aws: 'logoAWS',
  azure: 'logoAzure',
  unknownProvider: 'cloudSunny',
};

interface EntryTitleProps {
  onClick: () => void;
  dateRangeTs: { from: number; to: number };
  title: HostNodeRow['title'];
}

export const EntryTitle = ({ onClick, dateRangeTs, title }: EntryTitleProps) => {
  const { name, cloudProvider } = title;
  const location = useLocation();

  const link = useLinkProps({
    ...getNodeDetailUrl({
      nodeId: name,
      nodeType: 'host',
      search: {
        from: dateRangeTs.from,
        to: dateRangeTs.to,
        assetName: name,
        state: {
          originPathname: location.pathname,
          data: location.search,
        },
      },
    }),
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
          <EuiLink
            data-test-subj="hostsViewTableEntryTitleLink"
            className="eui-displayBlock eui-textTruncate"
            {...link}
          >
            {name}
          </EuiLink>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
