/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import type { InfraMetadata } from '../../../../../../common/http_api';
import { NOT_AVAILABLE_LABEL } from '../../../translations';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../../types';
import { ExpandableContent } from '../../../components/expandable_content';
import { MetadataHeader } from './metadata_header';
import { MetadataExplanationMessage } from '../../../components/metadata_explanation';
import { SectionTitle } from '../../../components/section_title';
import { Section } from '../../../components/section';

interface MetadataSummaryProps {
  metadata: InfraMetadata | null;
  loading: boolean;
  assetType: InventoryItemType;
}
interface MetadataSummaryWrapperProps {
  visibleMetadata: MetadataData[];
  loading: boolean;
  assetType: InventoryItemType;
}

export interface MetadataData {
  field: string;
  value?: string | string[];
  tooltipFieldLabel: string;
  tooltipLink?: string;
}

const hostExtendedMetadata = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
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

const hostMetadataData = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
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

const containerExtendedMetadata = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'runtime',
    value: metadataInfo?.container?.runtime,
    tooltipFieldLabel: 'container.runtime',
  },
  {
    field: 'cloudInstanceId',
    value: metadataInfo?.cloud?.instance?.id,
    tooltipFieldLabel: 'cloud.instance.id',
  },
  {
    field: 'cloudImageId',
    value: metadataInfo?.cloud?.imageId,
    tooltipFieldLabel: 'cloud.image.id',
  },
  {
    field: 'cloudProvider',
    value: metadataInfo?.cloud?.provider,
    tooltipFieldLabel: 'cloud.provider',
  },
];

const containerMetadataData = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'containerId',
    value: metadataInfo?.container?.id,
    tooltipFieldLabel: 'container.id',
  },
  {
    field: 'containerImageName',
    value: metadataInfo?.container?.image?.name,
    tooltipFieldLabel: 'container.image.name',
  },
  {
    field: 'hostName',
    value: metadataInfo?.host?.name,
    tooltipFieldLabel: 'host.name',
  },
];

const MetadataSummaryListWrapper = ({
  loading: metadataLoading,
  visibleMetadata,
  assetType,
}: MetadataSummaryWrapperProps) => {
  const { showTab } = useTabSwitcherContext();

  const onClick = () => {
    showTab(ContentTabIds.METADATA);
  };

  return (
    <Section
      title={
        <SectionTitle
          title={
            <FormattedMessage
              id="xpack.infra.assetDetails.overview.metadataSectionTitle"
              defaultMessage="Metadata"
            />
          }
          data-test-subj="infraAssetDetailsMetadataTitle"
        />
      }
      collapsible
      data-test-subj="infraAssetDetailsMetadataCollapsible"
      id="metadata"
      extraAction={
        <EuiButtonEmpty
          data-test-subj="infraAssetDetailsMetadataShowAllButton"
          onClick={onClick}
          size="xs"
          flush="both"
          iconSide="right"
          iconType="sortRight"
          key="metadata-link"
        >
          <FormattedMessage
            id="xpack.infra.assetDetails.metadataSummary.showAllMetadataButton"
            defaultMessage="Show all"
          />
        </EuiButtonEmpty>
      }
    >
      <>
        <MetadataExplanationMessage assetType={assetType} />
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          {visibleMetadata
            .filter((metadataValue) => metadataValue)
            .map((metadataValue) => (
              <EuiFlexItem key={metadataValue.field} grow={false} style={{ width: '200px' }}>
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
            ))}
        </EuiFlexGroup>
      </>
    </Section>
  );
};
export const MetadataSummaryList = ({ metadata, loading, assetType }: MetadataSummaryProps) => {
  switch (assetType) {
    case 'host':
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={[
            ...hostMetadataData(metadata?.info),
            ...hostExtendedMetadata(metadata?.info),
          ]}
          loading={loading}
          assetType={assetType}
        />
      );
    case 'container':
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={[
            ...containerMetadataData(metadata?.info),
            ...containerExtendedMetadata(metadata?.info),
          ]}
          loading={loading}
          assetType={assetType}
        />
      );
    default:
      return (
        <MetadataSummaryListWrapper visibleMetadata={[]} loading={loading} assetType={assetType} />
      );
  }
};

export const MetadataSummaryListCompact = ({
  metadata,
  loading,
  assetType,
}: MetadataSummaryProps) => {
  switch (assetType) {
    case 'host':
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={hostMetadataData(metadata?.info)}
          loading={loading}
          assetType={assetType}
        />
      );
    case 'container':
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={containerMetadataData(metadata?.info)}
          loading={loading}
          assetType={assetType}
        />
      );
    default:
      return (
        <MetadataSummaryListWrapper visibleMetadata={[]} loading={loading} assetType={assetType} />
      );
  }
};
