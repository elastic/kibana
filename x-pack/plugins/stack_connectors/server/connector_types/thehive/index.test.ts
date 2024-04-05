/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { TheHiveConnectorType, getConnectorType } from '.';

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);

let connectorType: TheHiveConnectorType;

describe('TheHive Connector', () => {
  beforeEach(() => {
    connectorType = getConnectorType();
  });
  test('exposes the connector as `TheHive` with id `.thehive`', () => {
    expect(connectorType.id).toEqual('.thehive');
    expect(connectorType.name).toEqual('TheHive');
  });
});
