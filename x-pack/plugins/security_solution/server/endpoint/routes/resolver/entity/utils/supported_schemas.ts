/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type { ExperimentalFeatures } from '../../../../../../common';
import type { ResolverSchema } from '../../../../../../common/endpoint/types';

interface SupportedSchema {
  /**
   * A name for the schema being used
   */
  name: string;

  /**
   * A constraint to search for in the documented returned by Elasticsearch
   */
  constraints: Array<{ field: string; value: string | string[] }>;

  /**
   * Schema to return to the frontend so that it can be passed in to call to the /tree API
   */
  schema: ResolverSchema;
}

/**
 * This structure defines the preset supported schemas for a resolver graph. We'll probably want convert this
 * implementation to something similar to how row renderers is implemented.
 */

export const getSupportedSchemas = (
  experimentalFeatures: ExperimentalFeatures | undefined
): SupportedSchema[] => {
  const sentinelOneDataInAnalyzerEnabled = experimentalFeatures?.sentinelOneDataInAnalyzerEnabled;
  const crowdstrikeDataInAnalyzerEnabled = experimentalFeatures?.crowdstrikeDataInAnalyzerEnabled;
  const jamfDataInAnalyzerEnabled = experimentalFeatures?.jamfDataInAnalyzerEnabled;

  const supportedFileBeatDataSets = [
    ...(sentinelOneDataInAnalyzerEnabled
      ? ['sentinel_one_cloud_funnel.event', 'sentinel_one.alert']
      : []),
    ...(crowdstrikeDataInAnalyzerEnabled
      ? ['crowdstrike.falcon', 'crowdstrike.fdr', 'crowdstrike.alert']
      : []),
    ...(jamfDataInAnalyzerEnabled
      ? ['jamf_protect.alerts', 'jamf_protect.web-threat-events', 'jamf_protect.web-traffic-events']
      : []),
  ];

  return [
    {
      name: 'endpoint',
      constraints: [
        {
          field: 'agent.type',
          value: 'endpoint',
        },
      ],
      schema: {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        ancestry: 'process.Ext.ancestry',
        name: 'process.name',
        agentId: 'agent.id',
      },
    },
    {
      name: 'winlogbeat',
      constraints: [
        {
          field: 'agent.type',
          value: 'winlogbeat',
        },
        {
          field: 'event.module',
          value: 'sysmon',
        },
      ],
      schema: {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        name: 'process.name',
      },
    },
    {
      name: 'sysmonViaFilebeat',
      constraints: [
        {
          field: 'agent.type',
          value: 'filebeat',
        },
        {
          field: 'event.dataset',
          value: 'windows.sysmon_operational',
        },
      ],
      schema: {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        name: 'process.name',
      },
    },
    {
      name: 'filebeat',
      constraints: [
        {
          field: 'agent.type',
          value: 'filebeat',
        },
        {
          field: 'event.dataset',
          value: supportedFileBeatDataSets,
        },
      ],
      schema: {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        name: 'process.name',
      },
    },
  ];
};

export function getFieldAsString(doc: unknown, field: string): string | undefined {
  const value = _.get(doc, field);
  if (value === undefined) {
    return undefined;
  }

  return String(value);
}
