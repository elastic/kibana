/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { allowedExperimentalValues } from '../../../../../common';

const { sentinelOneDataInAnalyzerEnabled } = allowedExperimentalValues;

const fileBeatModules = [
  ...(sentinelOneDataInAnalyzerEnabled ? ['sentinel_one_cloud_funnel', 'sentinel_one'] : []),
] as const;

export const isInvestigateInResolverActionEnabled = (ecsData?: Ecs) => {
  const agentType = get(['agent', 'type', 0], ecsData);
  const processEntityIds = get(['process', 'entity_id'], ecsData);
  const firstProcessEntityId = get(['process', 'entity_id', 0], ecsData);
  const eventModule = get(['event', 'module', 0], ecsData);
  const eventDataStream = get(['event', 'dataset'], ecsData);
  const datasetIncludesSysmon =
    Array.isArray(eventDataStream) &&
    eventDataStream.some((datastream) => datastream.includes('windows.sysmon'));
  const agentTypeIsEndpoint = agentType === 'endpoint';
  const agentTypeIsWinlogBeat = agentType === 'winlogbeat' && eventModule === 'sysmon';
  const agentTypeIsFilebeat = agentType === 'filebeat' && fileBeatModules.includes(eventModule);
  const isEndpointOrSysmonFromWinlogBeat =
    agentTypeIsEndpoint || agentTypeIsWinlogBeat || datasetIncludesSysmon || agentTypeIsFilebeat;
  const hasProcessEntityId =
    processEntityIds != null && processEntityIds.length === 1 && firstProcessEntityId !== '';
  return isEndpointOrSysmonFromWinlogBeat && hasProcessEntityId;
};
