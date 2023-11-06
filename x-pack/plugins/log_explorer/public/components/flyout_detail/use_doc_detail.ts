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
  const message = formatField(constants.MESSAGE_FIELD);

  // Service Highlights
  const serviceName = formatField(constants.SERVICE_NAME_FIELD);
  const traceId = formatField(constants.TRACE_ID);

  // Infrastructure Highlights
  const hostname = formatField(constants.HOST_NAME_FIELD);
  const orchestratorClusterName = formatField(constants.ORCHESTRATOR_CLUSTER_NAME);
  const orchestratorResourceId = formatField(constants.ORCHESTRATOR_RESOURCE_ID);

  // Cloud Highlights
  const cloudProvider = formatField(constants.CLOUD_PROVIDER);
  const cloudRegion = formatField(constants.CLOUD_REGION);
  const cloudAz = formatField(constants.CLOUD_AVAILABILITY_ZONE);
  const cloudProjectId = formatField(constants.CLOUD_PROJECT_ID);
  const cloudInstanceId = formatField(constants.CLOUD_INSTANCE_ID);

  // Other Highlights
  const logFilePath = formatField(constants.LOG_FILE_PATH);
  const namespace = formatField(constants.DATASTREAM_NAMESPACE);
  const dataset = formatField(constants.DATASTREAM_DATASET);
  const agentName = formatField(constants.AGENT_NAME);

  return {
    [constants.LOG_LEVEL_FIELD]: level,
    [constants.TIMESTAMP_FIELD]: timestamp,
    [constants.MESSAGE_FIELD]: message,
    [constants.SERVICE_NAME_FIELD]: serviceName,
    [constants.TRACE_ID]: traceId,
    [constants.HOST_NAME_FIELD]: hostname,
    [constants.ORCHESTRATOR_CLUSTER_NAME]: orchestratorClusterName,
    [constants.ORCHESTRATOR_RESOURCE_ID]: orchestratorResourceId,
    [constants.CLOUD_PROVIDER]: cloudProvider,
    [constants.CLOUD_REGION]: cloudRegion,
    [constants.CLOUD_AVAILABILITY_ZONE]: cloudAz,
    [constants.CLOUD_PROJECT_ID]: cloudProjectId,
    [constants.CLOUD_INSTANCE_ID]: cloudInstanceId,
    [constants.LOG_FILE_PATH]: logFilePath,
    [constants.DATASTREAM_NAMESPACE]: namespace,
    [constants.DATASTREAM_DATASET]: dataset,
    [constants.AGENT_NAME]: agentName,
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
