/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { Popover } from '../tabs/common/popover';
import { useMetadataStateContext } from '../hooks/use_metadata_state';

const HOSTNAME_DOCS_LINK =
  'https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-name';

const MetadataExplanationTooltipContent = React.memo(() => {
  const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
  };

  return (
    <EuiText size="xs" onClick={onClick} style={{ width: 200 }}>
      <FormattedMessage
        id="xpack.infra.assetDetails.metadata.tooltip.documentationLabel"
        defaultMessage="{metadata} is populated from the last event detected for this {hostName} for the selected date period."
        values={{
          metadata: (
            <i>
              <FormattedMessage
                id="xpack.infra.assetDetails.metadata.tooltip.metadata"
                defaultMessage="Metadata"
              />
            </i>
          ),
          hostName: (
            <EuiLink
              data-test-subj="infraAssetDetailsTooltipDocumentationLink"
              href={HOSTNAME_DOCS_LINK}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.infra.assetDetails.metadata.tooltip.documentationLink"
                defaultMessage="host.name"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
});

export const MetadataExplanationMessage = () => {
  const { metadata, loading } = useMetadataStateContext();

  return loading && !metadata ? (
    <EuiLoadingSpinner />
  ) : metadata?.info?.timestamp ? (
    <EuiFlexGroup gutterSize="xs" alignItems="baseline" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.infra.assetDetails.metadata.tooltip.metadataSectionTitle"
            defaultMessage="Showing metadata collected on {date} @ {time}"
            values={{
              date: (
                <FormattedDate
                  value={new Date(metadata?.info?.timestamp)}
                  month="short"
                  day="numeric"
                  year="numeric"
                />
              ),
              time: (
                <FormattedTime
                  value={new Date(metadata?.info?.timestamp)}
                  hour12={false}
                  hour="2-digit"
                  minute="2-digit"
                  second="2-digit"
                />
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Popover
          iconSize="s"
          iconColor="subdued"
          icon="iInCircle"
          data-test-subj="infraAssetDetailsMetadataPopoverButton"
        >
          <MetadataExplanationTooltipContent />
        </Popover>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};
