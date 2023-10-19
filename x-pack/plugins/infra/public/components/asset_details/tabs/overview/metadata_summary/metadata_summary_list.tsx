/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { InfraMetadata } from '../../../../../../common/http_api';
import { NOT_AVAILABLE_LABEL } from '../../../translations';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../../types';
import { ExpandableContent } from '../../../components/expandable_content';
import { MetadataHeader } from './metadata_header';
import { MetadataExplanationMessage } from '../../../components/metadata_explanation';
import { MetadataSectionTitle } from '../../../components/section_titles';

interface MetadataSummaryProps {
  metadata: InfraMetadata | null;
  loading: boolean;
}
interface MetadataSummaryWrapperProps {
  visibleMetadata: MetadataData[];
  loading: boolean;
}

export interface MetadataData {
  field: string;
  value?: string | string[];
  tooltipFieldLabel: string;
  tooltipLink?: string;
}

const extendedMetadata = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'cloudProvider',
    value: metadataInfo?.cloud?.provider,
    tooltipFieldLabel: 'cloud.provider',
    tooltipLink: 'https://www.elastic.co/guide/en/ecs/current/ecs-cloud.html#field-cloud-provider',
  },
  {
    field: 'operatingSystem',
    value: metadataInfo?.host?.os?.name,
    tooltipFieldLabel: 'host.os.name',
  },
];

const metadataData = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'hostIp',
    value: metadataInfo?.host?.ip,
    tooltipFieldLabel: 'host.ip',
    tooltipLink: 'https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-ip',
  },
  {
    field: 'hostOsVersion',
    value: metadataInfo?.host?.os?.version,
    tooltipFieldLabel: 'host.os.version',
  },
];

const MetadataSummaryListWrapper = ({
  loading: metadataLoading,
  visibleMetadata,
}: MetadataSummaryWrapperProps) => {
  const { showTab } = useTabSwitcherContext();

  const onClick = () => {
    showTab(ContentTabIds.METADATA);
  };

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" direction="column" wrap>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <MetadataSectionTitle />
          </EuiFlexItem>
          <EuiFlexItem grow={false} key="metadata-link">
            <EuiButtonEmpty
              data-test-subj="infraAssetDetailsMetadataShowAllButton"
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
        <EuiFlexGroup>
          <EuiFlexItem>
            <MetadataExplanationMessage />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiFlexGroup>
        {visibleMetadata.map(
          (metadataValue) =>
            metadataValue && (
              <EuiFlexItem key={metadataValue.field} grow={false}>
                <EuiDescriptionList data-test-subj="infraMetadataSummaryItem" compressed>
                  <MetadataHeader metadataValue={metadataValue} />
                  <EuiDescriptionListDescription>
                    {metadataLoading && !metadataValue.value ? (
                      <EuiLoadingSpinner />
                    ) : (
                      <ExpandableContent values={metadataValue.value ?? NOT_AVAILABLE_LABEL} />
                    )}
                  </EuiDescriptionListDescription>
                </EuiDescriptionList>
              </EuiFlexItem>
            )
        )}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
export const MetadataSummaryList = ({ metadata, loading }: MetadataSummaryProps) => (
  <MetadataSummaryListWrapper
    visibleMetadata={[...metadataData(metadata?.info), ...extendedMetadata(metadata?.info)]}
    loading={loading}
  />
);

export const MetadataSummaryListCompact = ({ metadata, loading }: MetadataSummaryProps) => (
  <MetadataSummaryListWrapper visibleMetadata={metadataData(metadata?.info)} loading={loading} />
);
