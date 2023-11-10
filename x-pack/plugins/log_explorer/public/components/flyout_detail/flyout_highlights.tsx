/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FlyoutContentActions } from '@kbn/discover-plugin/public';
import { DataTableRecord } from '@kbn/discover-utils/src/types';
import { useMeasure } from 'react-use/lib';
import { FlyoutDoc } from './types';
import * as constants from '../../../common/constants';
import { HighlightField } from './sub_components/highlight_field';
import {
  cloudAccordionTitle,
  flyoutCloudAvailabilityZoneLabel,
  flyoutCloudInstanceIdLabel,
  flyoutCloudProjectIdLabel,
  flyoutCloudProviderLabel,
  flyoutCloudRegionLabel,
  flyoutDatasetLabel,
  flyoutHostNameLabel,
  flyoutLogPathFileLabel,
  flyoutNamespaceLabel,
  flyoutOrchestratorClusterNameLabel,
  flyoutOrchestratorResourceIdLabel,
  flyoutServiceLabel,
  flyoutShipperLabel,
  flyoutTraceLabel,
  infraAccordionTitle,
  otherAccordionTitle,
  serviceAccordionTitle,
} from './translations';
import { HighlightSection } from './sub_components/highlight_section';
import { DiscoverActionsProvider } from '../../hooks/use_discover_action';
import { HighlightContainer } from './sub_components/highlight_container';
import { useFlyoutColumnWidth } from '../../hooks/use_flyouot_column_width';

export function FlyoutHighlights({
  formattedDoc,
  flattenedDoc,
  actions,
}: {
  formattedDoc: FlyoutDoc;
  flattenedDoc: DataTableRecord['flattened'];
  actions: FlyoutContentActions;
}) {
  const [ref, dimensions] = useMeasure<HTMLDivElement>();
  const { columns, fieldWidth } = useFlyoutColumnWidth(dimensions.width);
  return (
    <DiscoverActionsProvider value={actions}>
      <HighlightContainer ref={ref}>
        <HighlightSection title={serviceAccordionTitle} columns={columns}>
          {formattedDoc[constants.SERVICE_NAME_FIELD] && (
            <HighlightField
              label={flyoutServiceLabel}
              field={constants.SERVICE_NAME_FIELD}
              value={flattenedDoc[constants.SERVICE_NAME_FIELD]}
              formattedValue={formattedDoc[constants.SERVICE_NAME_FIELD]}
              dataTestSubj="logExplorerFlyoutService"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.TRACE_ID_FIELD] && (
            <HighlightField
              label={flyoutTraceLabel}
              field={constants.TRACE_ID_FIELD}
              value={flattenedDoc[constants.TRACE_ID_FIELD]}
              formattedValue={formattedDoc[constants.TRACE_ID_FIELD]}
              dataTestSubj="logExplorerFlyoutTrace"
              width={fieldWidth}
            />
          )}
        </HighlightSection>

        <HighlightSection title={infraAccordionTitle} columns={columns}>
          {formattedDoc[constants.HOST_NAME_FIELD] && (
            <HighlightField
              label={flyoutHostNameLabel}
              field={constants.HOST_NAME_FIELD}
              value={flattenedDoc[constants.HOST_NAME_FIELD]}
              formattedValue={formattedDoc[constants.HOST_NAME_FIELD]}
              dataTestSubj="logExplorerFlyoutHostName"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.ORCHESTRATOR_CLUSTER_NAME_FIELD] && (
            <HighlightField
              label={flyoutOrchestratorClusterNameLabel}
              field={constants.ORCHESTRATOR_CLUSTER_NAME_FIELD}
              value={flattenedDoc[constants.ORCHESTRATOR_CLUSTER_NAME_FIELD]}
              formattedValue={formattedDoc[constants.ORCHESTRATOR_CLUSTER_NAME_FIELD]}
              dataTestSubj="logExplorerFlyoutClusterName"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.ORCHESTRATOR_RESOURCE_ID_FIELD] && (
            <HighlightField
              label={flyoutOrchestratorResourceIdLabel}
              field={constants.ORCHESTRATOR_RESOURCE_ID_FIELD}
              value={flattenedDoc[constants.ORCHESTRATOR_RESOURCE_ID_FIELD]}
              formattedValue={formattedDoc[constants.ORCHESTRATOR_RESOURCE_ID_FIELD]}
              dataTestSubj="logExplorerFlyoutResourceId"
              width={fieldWidth}
            />
          )}
        </HighlightSection>

        <HighlightSection title={cloudAccordionTitle} columns={columns}>
          {formattedDoc[constants.CLOUD_PROVIDER_FIELD] && (
            <HighlightField
              label={flyoutCloudProviderLabel}
              field={constants.CLOUD_PROVIDER_FIELD}
              value={flattenedDoc[constants.CLOUD_PROVIDER_FIELD]}
              formattedValue={formattedDoc[constants.CLOUD_PROVIDER_FIELD]}
              dataTestSubj="logExplorerFlyoutCloudProvider"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.CLOUD_REGION_FIELD] && (
            <HighlightField
              label={flyoutCloudRegionLabel}
              field={constants.CLOUD_REGION_FIELD}
              value={flattenedDoc[constants.CLOUD_REGION_FIELD]}
              formattedValue={formattedDoc[constants.CLOUD_REGION_FIELD]}
              dataTestSubj="logExplorerFlyoutCloudRegion"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.CLOUD_AVAILABILITY_ZONE_FIELD] && (
            <HighlightField
              label={flyoutCloudAvailabilityZoneLabel}
              field={constants.CLOUD_AVAILABILITY_ZONE_FIELD}
              value={flattenedDoc[constants.CLOUD_AVAILABILITY_ZONE_FIELD]}
              formattedValue={formattedDoc[constants.CLOUD_AVAILABILITY_ZONE_FIELD]}
              dataTestSubj="logExplorerFlyoutCloudAz"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.CLOUD_PROJECT_ID_FIELD] && (
            <HighlightField
              label={flyoutCloudProjectIdLabel}
              field={constants.CLOUD_PROJECT_ID_FIELD}
              value={flattenedDoc[constants.CLOUD_PROJECT_ID_FIELD]}
              formattedValue={formattedDoc[constants.CLOUD_PROJECT_ID_FIELD]}
              dataTestSubj="logExplorerFlyoutCloudProjectId"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.CLOUD_INSTANCE_ID_FIELD] && (
            <HighlightField
              label={flyoutCloudInstanceIdLabel}
              field={constants.CLOUD_INSTANCE_ID_FIELD}
              value={flattenedDoc[constants.CLOUD_INSTANCE_ID_FIELD]}
              formattedValue={formattedDoc[constants.CLOUD_INSTANCE_ID_FIELD]}
              dataTestSubj="logExplorerFlyoutCloudInstanceId"
              width={fieldWidth}
            />
          )}
        </HighlightSection>

        <HighlightSection title={otherAccordionTitle} showBottomRule={false} columns={columns}>
          {formattedDoc[constants.LOG_FILE_PATH_FIELD] && (
            <HighlightField
              label={flyoutLogPathFileLabel}
              field={constants.LOG_FILE_PATH_FIELD}
              value={flattenedDoc[constants.LOG_FILE_PATH_FIELD]}
              formattedValue={formattedDoc[constants.LOG_FILE_PATH_FIELD]}
              dataTestSubj="logExplorerFlyoutLogPathFile"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.DATASTREAM_NAMESPACE_FIELD] && (
            <HighlightField
              label={flyoutNamespaceLabel}
              field={constants.DATASTREAM_NAMESPACE_FIELD}
              value={flattenedDoc[constants.DATASTREAM_NAMESPACE_FIELD]}
              formattedValue={formattedDoc[constants.DATASTREAM_NAMESPACE_FIELD]}
              dataTestSubj="logExplorerFlyoutNamespace"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.DATASTREAM_DATASET_FIELD] && (
            <HighlightField
              label={flyoutDatasetLabel}
              field={constants.DATASTREAM_DATASET_FIELD}
              value={flattenedDoc[constants.DATASTREAM_DATASET_FIELD]}
              formattedValue={formattedDoc[constants.DATASTREAM_DATASET_FIELD]}
              dataTestSubj="logExplorerFlyoutDataset"
              width={fieldWidth}
            />
          )}
          {formattedDoc[constants.AGENT_NAME_FIELD] && (
            <HighlightField
              label={flyoutShipperLabel}
              field={constants.AGENT_NAME_FIELD}
              value={flattenedDoc[constants.AGENT_NAME_FIELD]}
              formattedValue={formattedDoc[constants.AGENT_NAME_FIELD]}
              dataTestSubj="logExplorerFlyoutLogShipper"
              width={fieldWidth}
            />
          )}
        </HighlightSection>
      </HighlightContainer>
    </DiscoverActionsProvider>
  );
}
