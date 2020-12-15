/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorMappingsAttributes, ConnectorTypes } from '../../../common/api/connectors';
interface TestMappings {
  [key: string]: ConnectorMappingsAttributes[];
}
export const mappings: TestMappings = {
  [ConnectorTypes.jira]: [
    {
      source: 'title',
      target: 'summary',
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: 'description',
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'comments',
      action_type: 'append',
    },
  ],
  [ConnectorTypes.resilient]: [
    {
      source: 'title',
      target: 'name',
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: 'description',
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'comments',
      action_type: 'append',
    },
  ],
  [ConnectorTypes.servicenow]: [
    {
      source: 'title',
      target: 'short_description',
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: 'description',
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'comments',
      action_type: 'append',
    },
  ],
};
