/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '../../../../../hooks/use_boolean';
import type { MetadataData } from './metadata_summary_list';

const columnTitles = {
  hostIp: i18n.translate('xpack.infra.assetDetailsEmbeddable.overview.metadataHostIpHeading', {
    defaultMessage: 'Host IP',
  }),
  hostOsVersion: i18n.translate(
    'xpack.infra.assetDetailsEmbeddable.overview.metadataHostOsVersionHeading',
    {
      defaultMessage: 'Host OS version',
    }
  ),
  cloudProvider: i18n.translate(
    'xpack.infra.assetDetailsEmbeddable.overview.metadataCloudProviderHeading',
    {
      defaultMessage: 'Cloud provider',
    }
  ),
  operatingSystem: i18n.translate(
    'xpack.infra.assetDetailsEmbeddable.overview.metadataOperatingSystemHeading',
    {
      defaultMessage: 'Operating system',
    }
  ),
};

type MetadataFields = 'hostIp' | 'hostOsVersion';

interface MetadataSummaryProps {
  metadataValue: MetadataData;
}

export const MetadataHeader = ({ metadataValue }: MetadataSummaryProps) => {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  return (
    <EuiDescriptionListTitle
      css={css`
        white-space: nowrap;
      `}
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          {columnTitles[metadataValue.field as MetadataFields]}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiIcon
                data-test-subj="infraAssetDetailsMetadataSummaryPopoverButton"
                type="questionInCircle"
                onClick={togglePopover}
              />
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            repositionOnScroll
            anchorPosition="upCenter"
          >
            {metadataValue.tooltipLink ? (
              <FormattedMessage
                id="xpack.infra.assetDetails.overviewMetadata.tooltip.documentationLabel"
                defaultMessage="See {documentation} for more details."
                values={{
                  documentation: (
                    <EuiLink
                      data-test-subj="infraAssetDetailsTooltipMetadataDocumentationLink"
                      href={metadataValue.tooltipLink}
                      target="_blank"
                    >
                      <code>{metadataValue.tooltipFieldLabel}</code>
                    </EuiLink>
                  ),
                }}
              />
            ) : (
              <code>{metadataValue.tooltipFieldLabel}</code>
            )}
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiDescriptionListTitle>
  );
};
