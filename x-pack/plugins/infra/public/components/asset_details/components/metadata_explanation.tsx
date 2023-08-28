/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useDateRangeProviderContext } from '../hooks/use_date_range';
import { Popover } from '../tabs/common/popover';

const HOSTNAME_DOCS_LINK =
  'https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-name';

const MetadataExplanationTooltipContent = React.memo(() => {
  const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
  };

  return (
    <EuiText size="s" onClick={onClick} style={{ width: 200 }}>
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
  const { getDateRangeInTimestamp } = useDateRangeProviderContext();
  const dateFromRange = new Date(getDateRangeInTimestamp().to);
  const dateString = dateFromRange.toLocaleDateString();
  const timeString = dateFromRange.toLocaleTimeString();

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="baseline">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.infra.assetDetails.metadata.tooltip.metadataSectionTitle"
            defaultMessage="Showing metadata collected on {date} @ {time}"
            values={{
              date: dateString,
              time: timeString,
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Popover
          iconSize="s"
          iconColor="subdued"
          icon="questionInCircle"
          panelPaddingSize="m"
          data-test-subj="infraAssetDetailsMetadataPopoverButton"
        >
          <MetadataExplanationTooltipContent />
        </Popover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
