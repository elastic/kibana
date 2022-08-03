/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { transformConnectorsForImport } from './transform_connectors_for_import';

describe('transform connector for export', () => {
  const connectorsWithNoSecrets = [
    {
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: '.email',
        name: 'email connector without auth',
        isMissingSecrets: false,
        config: {
          hasAuth: false,
          from: 'me@me.com',
          host: 'host',
          port: 22,
          service: null,
          secure: null,
        },
      },
      references: [],
    },
  ];
  const connectorsWithSecrets = [
    {
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: '.email',
        name: 'email connector with auth',
        isMissingSecrets: true,
        config: {
          hasAuth: true,
          from: 'me@me.com',
          host: 'host',
          port: 22,
          service: null,
          secure: null,
        },
      },
      references: [],
    },
  ];

  it('should add secrets for connectors without missing secrets', () => {
    const connectors = cloneDeep(connectorsWithNoSecrets);
    transformConnectorsForImport(connectorsWithNoSecrets);
    expect(connectorsWithNoSecrets).toEqual(
      connectors.map((connector) => ({
        ...connector,
        attributes: {
          ...connector.attributes,
          secrets: {},
        },
      }))
    );
  });

  it('should not change connectors with missing secrets', () => {
    const connectors = cloneDeep(connectorsWithSecrets);
    transformConnectorsForImport(connectorsWithSecrets);
    expect(connectorsWithSecrets).toEqual(connectors);
  });
});
