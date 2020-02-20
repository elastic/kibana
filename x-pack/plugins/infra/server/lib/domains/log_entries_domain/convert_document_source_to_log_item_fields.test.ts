/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { convertDocumentSourceToLogItemFields } from './convert_document_source_to_log_item_fields';

describe('convertDocumentSourceToLogItemFields', () => {
  test('should convert document', () => {
    const doc = {
      agent: {
        hostname: 'demo-stack-client-01',
        id: '7adef8b6-2ab7-45cd-a0d5-b3baad735f1b',
        type: 'filebeat',
        ephemeral_id: 'a0c8164b-3564-4e32-b0bf-f4db5a7ae566',
        version: '7.0.0',
      },
      tags: ['prod', 'web'],
      metadata: [
        { key: 'env', value: 'prod' },
        { key: 'stack', value: 'web' },
      ],
      host: {
        hostname: 'packer-virtualbox-iso-1546820004',
        name: 'demo-stack-client-01',
      },
    };

    const fields = convertDocumentSourceToLogItemFields(doc);
    expect(fields).toEqual([
      {
        field: 'agent.hostname',
        value: 'demo-stack-client-01',
      },
      {
        field: 'agent.id',
        value: '7adef8b6-2ab7-45cd-a0d5-b3baad735f1b',
      },
      {
        field: 'agent.type',
        value: 'filebeat',
      },
      {
        field: 'agent.ephemeral_id',
        value: 'a0c8164b-3564-4e32-b0bf-f4db5a7ae566',
      },
      {
        field: 'agent.version',
        value: '7.0.0',
      },
      {
        field: 'tags',
        value: '["prod","web"]',
      },
      {
        field: 'metadata',
        value: '[{"key":"env","value":"prod"},{"key":"stack","value":"web"}]',
      },
      {
        field: 'host.hostname',
        value: 'packer-virtualbox-iso-1546820004',
      },
      {
        field: 'host.name',
        value: 'demo-stack-client-01',
      },
    ]);
  });
});
