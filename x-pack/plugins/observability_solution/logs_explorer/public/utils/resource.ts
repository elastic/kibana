/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogDocument, ResourceFields } from '../../common/document';
import * as constants from '../../common/constants';
import { getFieldFromDoc } from './get_field_from_flattened_doc';

export const getUnformattedResourceFields = (doc: LogDocument): ResourceFields => {
  const serviceName = getFieldFromDoc(doc, constants.SERVICE_NAME_FIELD);
  const hostName = getFieldFromDoc(doc, constants.HOST_NAME_FIELD);
  const agentName = getFieldFromDoc(doc, constants.AGENT_NAME_FIELD);
  const orchestratorClusterName = getFieldFromDoc(doc, constants.ORCHESTRATOR_CLUSTER_NAME_FIELD);
  const orchestratorResourceId = getFieldFromDoc(doc, constants.ORCHESTRATOR_RESOURCE_ID_FIELD);
  const orchestratorNamespace = getFieldFromDoc(doc, constants.ORCHESTRATOR_NAMESPACE_FIELD);
  const containerName = getFieldFromDoc(doc, constants.CONTAINER_NAME_FIELD);
  const containerId = getFieldFromDoc(doc, constants.CONTAINER_ID_FIELD);
  const cloudInstanceId = getFieldFromDoc(doc, constants.CLOUD_INSTANCE_ID_FIELD);

  return {
    [constants.SERVICE_NAME_FIELD]: serviceName,
    [constants.HOST_NAME_FIELD]: hostName,
    [constants.AGENT_NAME_FIELD]: agentName,
    [constants.ORCHESTRATOR_CLUSTER_NAME_FIELD]: orchestratorClusterName,
    [constants.ORCHESTRATOR_RESOURCE_ID_FIELD]: orchestratorResourceId,
    [constants.ORCHESTRATOR_NAMESPACE_FIELD]: orchestratorNamespace,
    [constants.CONTAINER_NAME_FIELD]: containerName,
    [constants.CONTAINER_ID_FIELD]: containerId,
    [constants.CLOUD_INSTANCE_ID_FIELD]: cloudInstanceId,
  };
};
