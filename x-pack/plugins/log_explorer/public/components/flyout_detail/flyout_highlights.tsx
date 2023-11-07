/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { FlyoutContentActions } from '@kbn/discover-plugin/public';
import { DataTableRecord } from '@kbn/discover-utils/src/types';
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
import { HighlightSection } from './sub_components/highlight_container';
import { DiscoverActionContext } from '../../context/discover_actions/discover_actions_context';

export function FlyoutHighlights({
  formattedDoc,
  flattenedDoc,
  actions,
}: {
  formattedDoc: FlyoutDoc;
  flattenedDoc: DataTableRecord['flattened'];
  actions: FlyoutContentActions;
}) {
  return (
    <DiscoverActionContext.Provider value={{ actions }}>
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder={true}>
        <HighlightSection title={serviceAccordionTitle}>
          {formattedDoc[constants.SERVICE_NAME_FIELD] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutServiceLabel}
                field={constants.SERVICE_NAME_FIELD}
                value={flattenedDoc[constants.SERVICE_NAME_FIELD]}
                formattedValue={formattedDoc[constants.SERVICE_NAME_FIELD]}
                dataTestSubj="logExplorerFlyoutService"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.TRACE_ID] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutTraceLabel}
                field={constants.TRACE_ID}
                value={flattenedDoc[constants.TRACE_ID]}
                formattedValue={formattedDoc[constants.TRACE_ID]}
                dataTestSubj="logExplorerFlyoutTrace"
              />
            </EuiFlexItem>
          )}
        </HighlightSection>

        <HighlightSection title={infraAccordionTitle}>
          {formattedDoc[constants.HOST_NAME_FIELD] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutHostNameLabel}
                field={constants.HOST_NAME_FIELD}
                value={flattenedDoc[constants.HOST_NAME_FIELD]}
                formattedValue={formattedDoc[constants.HOST_NAME_FIELD]}
                dataTestSubj="logExplorerFlyoutHostName"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.ORCHESTRATOR_CLUSTER_NAME] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutOrchestratorClusterNameLabel}
                field={constants.ORCHESTRATOR_CLUSTER_NAME}
                value={flattenedDoc[constants.ORCHESTRATOR_CLUSTER_NAME]}
                formattedValue={formattedDoc[constants.ORCHESTRATOR_CLUSTER_NAME]}
                dataTestSubj="logExplorerFlyoutClusterName"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.ORCHESTRATOR_RESOURCE_ID] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutOrchestratorResourceIdLabel}
                field={constants.ORCHESTRATOR_RESOURCE_ID}
                value={flattenedDoc[constants.ORCHESTRATOR_RESOURCE_ID]}
                formattedValue={formattedDoc[constants.ORCHESTRATOR_RESOURCE_ID]}
                dataTestSubj="logExplorerFlyoutResourceId"
              />
            </EuiFlexItem>
          )}
        </HighlightSection>

        <HighlightSection title={cloudAccordionTitle}>
          {formattedDoc[constants.CLOUD_PROVIDER] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutCloudProviderLabel}
                field={constants.CLOUD_PROVIDER}
                value={flattenedDoc[constants.CLOUD_PROVIDER]}
                formattedValue={formattedDoc[constants.CLOUD_PROVIDER]}
                dataTestSubj="logExplorerFlyoutCloudProvider"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.CLOUD_REGION] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutCloudRegionLabel}
                field={constants.CLOUD_REGION}
                value={flattenedDoc[constants.CLOUD_REGION]}
                formattedValue={formattedDoc[constants.CLOUD_REGION]}
                dataTestSubj="logExplorerFlyoutCloudRegion"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.CLOUD_AVAILABILITY_ZONE] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutCloudAvailabilityZoneLabel}
                field={constants.CLOUD_AVAILABILITY_ZONE}
                value={flattenedDoc[constants.CLOUD_AVAILABILITY_ZONE]}
                formattedValue={formattedDoc[constants.CLOUD_AVAILABILITY_ZONE]}
                dataTestSubj="logExplorerFlyoutCloudAz"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.CLOUD_PROJECT_ID] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutCloudProjectIdLabel}
                field={constants.CLOUD_PROJECT_ID}
                value={flattenedDoc[constants.CLOUD_PROJECT_ID]}
                formattedValue={formattedDoc[constants.CLOUD_PROJECT_ID]}
                dataTestSubj="logExplorerFlyoutCloudProjectId"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.CLOUD_INSTANCE_ID] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutCloudInstanceIdLabel}
                field={constants.CLOUD_INSTANCE_ID}
                value={flattenedDoc[constants.CLOUD_INSTANCE_ID]}
                formattedValue={formattedDoc[constants.CLOUD_INSTANCE_ID]}
                dataTestSubj="logExplorerFlyoutCloudInstanceId"
              />
            </EuiFlexItem>
          )}
        </HighlightSection>

        <HighlightSection title={otherAccordionTitle} showBottomRule={false}>
          {formattedDoc[constants.LOG_FILE_PATH] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutLogPathFileLabel}
                field={constants.LOG_FILE_PATH}
                value={flattenedDoc[constants.LOG_FILE_PATH]}
                formattedValue={formattedDoc[constants.LOG_FILE_PATH]}
                dataTestSubj="logExplorerFlyoutLogPathFile"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.DATASTREAM_NAMESPACE] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutNamespaceLabel}
                field={constants.DATASTREAM_NAMESPACE}
                value={flattenedDoc[constants.DATASTREAM_NAMESPACE]}
                formattedValue={formattedDoc[constants.DATASTREAM_NAMESPACE]}
                dataTestSubj="logExplorerFlyoutNamespace"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.DATASTREAM_DATASET] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutDatasetLabel}
                field={constants.DATASTREAM_DATASET}
                value={flattenedDoc[constants.DATASTREAM_DATASET]}
                formattedValue={formattedDoc[constants.DATASTREAM_DATASET]}
                dataTestSubj="logExplorerFlyoutDataset"
              />
            </EuiFlexItem>
          )}
          {formattedDoc[constants.AGENT_NAME] && (
            <EuiFlexItem>
              <HighlightField
                label={flyoutShipperLabel}
                field={constants.AGENT_NAME}
                value={flattenedDoc[constants.AGENT_NAME]}
                formattedValue={formattedDoc[constants.AGENT_NAME]}
                dataTestSubj="logExplorerFlyoutLogShipper"
              />
            </EuiFlexItem>
          )}
        </HighlightSection>
      </EuiPanel>
    </DiscoverActionContext.Provider>
  );
}
