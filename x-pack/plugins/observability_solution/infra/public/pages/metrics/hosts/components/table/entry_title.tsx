/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiToolTip } from '@elastic/eui';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { CloudProviderIcon } from '@kbn/custom-icons';
import { useNodeDetailsRedirect } from '../../../../link_to';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';

interface EntryTitleProps {
  onClick: () => void;
  title: HostNodeRow['title'];
}

export const EntryTitle = ({ onClick, title }: EntryTitleProps) => {
  const { name, cloudProvider } = title;
  const { getNodeDetailUrl } = useNodeDetailsRedirect();
  const { parsedDateRange } = useUnifiedSearchContext();

  const link = useLinkProps({
    ...getNodeDetailUrl({
      assetId: name,
      assetType: 'host',
      search: {
        from: parsedDateRange?.from ? new Date(parsedDateRange?.from).getTime() : undefined,
        to: parsedDateRange?.to ? new Date(parsedDateRange.to).getTime() : undefined,
        name,
      },
    }),
  });

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
          <CloudProviderIcon cloudProvider={cloudProvider} size="m" title={name} />
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
