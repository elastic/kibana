/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiToolTip } from '@elastic/eui';
import { CloudProviderIcon } from '@kbn/custom-icons';
import { useNodeDetailsRedirect } from '../../../../link_to/use_node_details_redirect';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';

interface EntryTitleProps {
  onClick: () => void;
  title: HostNodeRow['title'];
}

export const EntryTitle = ({ onClick, title }: EntryTitleProps) => {
  const { name, cloudProvider } = title;
  const { parsedDateRange } = useUnifiedSearchContext();
  const { getNodeDetailUrl } = useNodeDetailsRedirect();

  const link = getNodeDetailUrl({
    assetId: name,
    assetType: 'host',
    search: {
      from: parsedDateRange?.from ? new Date(parsedDateRange?.from).getTime() : undefined,
      to: parsedDateRange?.to ? new Date(parsedDateRange.to).getTime() : undefined,
      name,
    },
  });

  const providerName = cloudProvider ?? 'Unknown';

  return (
    <EuiToolTip
      delay="long"
      anchorClassName="eui-displayBlock"
      content={i18n.translate('xpack.infra.hostsViewPage.table.nameTooltip', {
        defaultMessage: '{providerName}: {name}',
        values: {
          providerName,
          name,
        },
      })}
    >
      <EuiLink data-test-subj="hostsViewTableEntryTitleLink" {...link}>
        <EuiFlexGroup
          className="eui-textTruncate"
          alignItems="center"
          gutterSize="s"
          responsive={false}
          onClick={onClick}
        >
          <EuiFlexItem grow={false}>
            <CloudProviderIcon
              cloudProvider={cloudProvider}
              size="m"
              title={providerName}
              role="presentation"
            />
          </EuiFlexItem>
          <EuiFlexItem className="eui-textTruncate">
            <span className="eui-textTruncate">{name}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
    </EuiToolTip>
  );
};
