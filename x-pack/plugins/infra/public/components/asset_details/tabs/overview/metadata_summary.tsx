/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '../../../../hooks/use_boolean';
import type { InfraMetadata } from '../../../../../common/http_api';
import { NOT_AVAILABLE_LABEL } from '../../translations';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { FlyoutTabIds } from '../../types';
import { ExpandableContent } from '../../components/expandable_content';

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
};

type MetadataFields = 'hostIp' | 'hostOsVersion';

const metadataData = (metadataInfo: InfraMetadata['info']) => [
  {
    field: 'hostIp',
    value: metadataInfo?.host?.ip,
    tooltipLinkLabel: 'host.ip',
    tooltipLink: 'https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-ip',
  },
  {
    field: 'hostOsVersion',
    value: metadataInfo?.host?.os?.version,
  },
];

interface MetadataSummaryProps {
  metadata: InfraMetadata | null;
  metadataLoading: boolean;
}

export const MetadataSummary = ({ metadata, metadataLoading }: MetadataSummaryProps) => {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  const { showTab } = useTabSwitcherContext();

  const onClick = () => {
    showTab(FlyoutTabIds.METADATA);
  };

  return (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap justifyContent="spaceBetween">
      <EuiFlexGroup alignItems="flexStart">
        {metadataData(metadata?.info).map((metadataValue) => (
          <EuiFlexItem key={metadataValue.field}>
            <EuiDescriptionList data-test-subj="infraMetadataSummaryItem" compressed>
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
                    {metadataValue.tooltipLink && (
                      <EuiPopover
                        button={
                          <EuiIcon
                            data-test-subj="assetDetailsMetadataSummaryPopoverButton"
                            type="questionInCircle"
                            onClick={togglePopover}
                          />
                        }
                        isOpen={isPopoverOpen}
                        closePopover={closePopover}
                        repositionOnScroll
                        anchorPosition="upCenter"
                      >
                        <FormattedMessage
                          id="xpack.infra.assetDetails.overviewMetadata.tooltip.documentationLabel"
                          defaultMessage="See {documentation} for more details."
                          values={{
                            documentation: (
                              <EuiLink
                                data-test-subj="assetDetailsTooltipDocumentationLink"
                                href={metadataValue.tooltipLink}
                                target="_blank"
                              >
                                {metadataValue.tooltipLinkLabel}
                              </EuiLink>
                            ),
                          }}
                        />
                      </EuiPopover>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {metadataLoading ? (
                  <EuiLoadingSpinner />
                ) : (
                  <ExpandableContent values={metadataValue.value ?? NOT_AVAILABLE_LABEL} />
                )}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiFlexItem grow={false} key="metadata-link">
        <EuiButtonEmpty
          data-test-subj="infraMetadataSummaryShowAllMetadataButton"
          onClick={onClick}
          size="xs"
          flush="both"
          iconSide="right"
          iconType="sortRight"
        >
          <FormattedMessage
            id="xpack.infra.assetDetailsEmbeddable.metadataSummary.showAllMetadataButton"
            defaultMessage="Show all"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
