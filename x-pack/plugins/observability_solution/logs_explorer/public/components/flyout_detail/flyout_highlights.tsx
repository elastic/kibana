/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CloudProvider, CloudProviderIcon } from '@kbn/custom-icons';
import { useMeasure } from 'react-use/lib';
import { first } from 'lodash';
import { FlyoutDoc, LogDocument } from '../../../common/document';
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
  otherAccordionTitle,
  serviceInfraAccordionTitle,
} from '../common/translations';
import { HighlightSection } from './sub_components/highlight_section';
import { HighlightContainer } from './sub_components/highlight_container';
import { useFlyoutColumnWidth } from '../../hooks/use_flyouot_column_width';

export function FlyoutHighlights({
  formattedDoc,
  flattenedDoc,
}: {
  formattedDoc: FlyoutDoc;
  flattenedDoc: LogDocument['flattened'];
}) {
  const [ref, dimensions] = useMeasure<HTMLDivElement>();
  const { columns, fieldWidth } = useFlyoutColumnWidth(dimensions.width);
  return (
    <HighlightContainer ref={ref}>
      {/* Service & Infrastructure highlight */}
      <HighlightSection
        title={serviceInfraAccordionTitle}
        columns={columns}
        data-test-subj="logExplorerFlyoutHighlightSectionServiceInfra"
      >
        {formattedDoc[constants.SERVICE_NAME_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutService"
            field={constants.SERVICE_NAME_FIELD}
            formattedValue={formattedDoc[constants.SERVICE_NAME_FIELD]}
            label={flyoutServiceLabel}
            value={flattenedDoc[constants.SERVICE_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.HOST_NAME_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutHostName"
            field={constants.HOST_NAME_FIELD}
            formattedValue={formattedDoc[constants.HOST_NAME_FIELD]}
            label={flyoutHostNameLabel}
            value={flattenedDoc[constants.HOST_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.TRACE_ID_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutTrace"
            field={constants.TRACE_ID_FIELD}
            formattedValue={formattedDoc[constants.TRACE_ID_FIELD]}
            label={flyoutTraceLabel}
            value={flattenedDoc[constants.TRACE_ID_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.ORCHESTRATOR_CLUSTER_NAME_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutClusterName"
            field={constants.ORCHESTRATOR_CLUSTER_NAME_FIELD}
            formattedValue={formattedDoc[constants.ORCHESTRATOR_CLUSTER_NAME_FIELD]}
            label={flyoutOrchestratorClusterNameLabel}
            value={flattenedDoc[constants.ORCHESTRATOR_CLUSTER_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.ORCHESTRATOR_RESOURCE_ID_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutResourceId"
            field={constants.ORCHESTRATOR_RESOURCE_ID_FIELD}
            formattedValue={formattedDoc[constants.ORCHESTRATOR_RESOURCE_ID_FIELD]}
            label={flyoutOrchestratorResourceIdLabel}
            value={flattenedDoc[constants.ORCHESTRATOR_RESOURCE_ID_FIELD]}
            width={fieldWidth}
          />
        )}
      </HighlightSection>
      {/* Cloud highlight */}
      <HighlightSection
        title={cloudAccordionTitle}
        columns={columns}
        data-test-subj="logExplorerFlyoutHighlightSectionCloud"
      >
        {formattedDoc[constants.CLOUD_PROVIDER_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutCloudProvider"
            field={constants.CLOUD_PROVIDER_FIELD}
            formattedValue={formattedDoc[constants.CLOUD_PROVIDER_FIELD]}
            icon={
              <CloudProviderIcon
                cloudProvider={first(
                  (flattenedDoc[constants.CLOUD_PROVIDER_FIELD] ?? []) as CloudProvider[]
                )}
              />
            }
            label={flyoutCloudProviderLabel}
            value={flattenedDoc[constants.CLOUD_PROVIDER_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.CLOUD_REGION_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutCloudRegion"
            field={constants.CLOUD_REGION_FIELD}
            formattedValue={formattedDoc[constants.CLOUD_REGION_FIELD]}
            label={flyoutCloudRegionLabel}
            value={flattenedDoc[constants.CLOUD_REGION_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.CLOUD_AVAILABILITY_ZONE_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutCloudAz"
            field={constants.CLOUD_AVAILABILITY_ZONE_FIELD}
            formattedValue={formattedDoc[constants.CLOUD_AVAILABILITY_ZONE_FIELD]}
            label={flyoutCloudAvailabilityZoneLabel}
            value={flattenedDoc[constants.CLOUD_AVAILABILITY_ZONE_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.CLOUD_PROJECT_ID_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutCloudProjectId"
            field={constants.CLOUD_PROJECT_ID_FIELD}
            formattedValue={formattedDoc[constants.CLOUD_PROJECT_ID_FIELD]}
            label={flyoutCloudProjectIdLabel}
            value={flattenedDoc[constants.CLOUD_PROJECT_ID_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.CLOUD_INSTANCE_ID_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutCloudInstanceId"
            field={constants.CLOUD_INSTANCE_ID_FIELD}
            formattedValue={formattedDoc[constants.CLOUD_INSTANCE_ID_FIELD]}
            label={flyoutCloudInstanceIdLabel}
            value={flattenedDoc[constants.CLOUD_INSTANCE_ID_FIELD]}
            width={fieldWidth}
          />
        )}
      </HighlightSection>
      {/* Other highlights */}
      <HighlightSection
        title={otherAccordionTitle}
        columns={columns}
        data-test-subj="logExplorerFlyoutHighlightSectionOther"
      >
        {formattedDoc[constants.LOG_FILE_PATH_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutLogPathFile"
            field={constants.LOG_FILE_PATH_FIELD}
            formattedValue={formattedDoc[constants.LOG_FILE_PATH_FIELD]}
            label={flyoutLogPathFileLabel}
            value={flattenedDoc[constants.LOG_FILE_PATH_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.DATASTREAM_DATASET_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutDataset"
            field={constants.DATASTREAM_DATASET_FIELD}
            formattedValue={formattedDoc[constants.DATASTREAM_DATASET_FIELD]}
            label={flyoutDatasetLabel}
            value={flattenedDoc[constants.DATASTREAM_DATASET_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[constants.DATASTREAM_NAMESPACE_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutNamespace"
            field={constants.DATASTREAM_NAMESPACE_FIELD}
            formattedValue={formattedDoc[constants.DATASTREAM_NAMESPACE_FIELD]}
            label={flyoutNamespaceLabel}
            value={flattenedDoc[constants.DATASTREAM_NAMESPACE_FIELD]}
            width={fieldWidth}
            useBadge
          />
        )}
        {formattedDoc[constants.AGENT_NAME_FIELD] && (
          <HighlightField
            data-test-subj="logExplorerFlyoutLogShipper"
            field={constants.AGENT_NAME_FIELD}
            formattedValue={formattedDoc[constants.AGENT_NAME_FIELD]}
            label={flyoutShipperLabel}
            value={flattenedDoc[constants.AGENT_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
      </HighlightSection>
    </HighlightContainer>
  );
}
