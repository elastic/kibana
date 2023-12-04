/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatFieldValue } from '@kbn/discover-utils';
import * as constants from '../../../common/constants';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { FlyoutDoc, FlyoutProps, LogDocument } from './types';

export function useDocDetail(
  doc: LogDocument,
  { dataView }: Pick<FlyoutProps, 'dataView'>
): FlyoutDoc {
  const { services } = useKibanaContextForPlugin();

  const formatField = <F extends keyof LogDocument['flattened']>(
    field: F
  ): LogDocument['flattened'][F] => {
    return (
      doc.flattened[field] &&
      formatFieldValue(
        doc.flattened[field],
        doc.raw,
        services.fieldFormats,
        dataView,
        dataView.fields.getByName(field)
      )
    );
  };

  // Flyout Headers
  const level = formatField(constants.LOG_LEVEL_FIELD)?.toLowerCase();
  const timestamp = formatField(constants.TIMESTAMP_FIELD);
  const message = doc.flattened[constants.MESSAGE_FIELD];

  // Service Highlights
  const serviceName = formatField(constants.SERVICE_NAME_FIELD);
  const traceId = formatField(constants.TRACE_ID_FIELD);

  // Infrastructure Highlights
  const hostname = formatField(constants.HOST_NAME_FIELD);
  const orchestratorClusterName = formatField(constants.ORCHESTRATOR_CLUSTER_NAME_FIELD);
  const orchestratorResourceId = formatField(constants.ORCHESTRATOR_RESOURCE_ID_FIELD);

  // Cloud Highlights
  const cloudProvider = formatField(constants.CLOUD_PROVIDER_FIELD);
  const cloudRegion = formatField(constants.CLOUD_REGION_FIELD);
  const cloudAz = formatField(constants.CLOUD_AVAILABILITY_ZONE_FIELD);
  const cloudProjectId = formatField(constants.CLOUD_PROJECT_ID_FIELD);
  const cloudInstanceId = formatField(constants.CLOUD_INSTANCE_ID_FIELD);

  // Other Highlights
  const logFilePath = formatField(constants.LOG_FILE_PATH_FIELD);
  const namespace = formatField(constants.DATASTREAM_NAMESPACE_FIELD);
  const dataset = formatField(constants.DATASTREAM_DATASET_FIELD);
  const agentName = formatField(constants.AGENT_NAME_FIELD);

  return {
    [constants.LOG_LEVEL_FIELD]: level,
    [constants.TIMESTAMP_FIELD]: timestamp,
    [constants.MESSAGE_FIELD]: message,
    [constants.SERVICE_NAME_FIELD]: serviceName,
    [constants.TRACE_ID_FIELD]: traceId,
    [constants.HOST_NAME_FIELD]: hostname,
    [constants.ORCHESTRATOR_CLUSTER_NAME_FIELD]: orchestratorClusterName,
    [constants.ORCHESTRATOR_RESOURCE_ID_FIELD]: orchestratorResourceId,
    [constants.CLOUD_PROVIDER_FIELD]: cloudProvider,
    [constants.CLOUD_REGION_FIELD]: cloudRegion,
    [constants.CLOUD_AVAILABILITY_ZONE_FIELD]: cloudAz,
    [constants.CLOUD_PROJECT_ID_FIELD]: cloudProjectId,
    [constants.CLOUD_INSTANCE_ID_FIELD]: cloudInstanceId,
    [constants.LOG_FILE_PATH_FIELD]: logFilePath,
    [constants.DATASTREAM_NAMESPACE_FIELD]: namespace,
    [constants.DATASTREAM_DATASET_FIELD]: dataset,
    [constants.AGENT_NAME_FIELD]: agentName,
  };
}

export const getDocDetailHeaderRenderFlags = (doc: FlyoutDoc) => {
  const hasTimestamp = Boolean(doc[constants.TIMESTAMP_FIELD]);
  const hasLogLevel = Boolean(doc[constants.LOG_LEVEL_FIELD]);
  const hasMessage = Boolean(doc[constants.MESSAGE_FIELD]);

  const hasBadges = hasTimestamp || hasLogLevel;

  const hasFlyoutHeader = hasBadges || hasMessage;

  return {
    hasTimestamp,
    hasLogLevel,
    hasMessage,
    hasBadges,
    hasFlyoutHeader,
  };
};
