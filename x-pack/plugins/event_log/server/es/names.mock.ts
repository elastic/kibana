/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsNames } from './names';

const createNamesMock = () => {
  const mock: jest.Mocked<EsNames> = {
    base: '.kibana',
    alias: '.kibana-event-log-8.0.0',
    ilmPolicy: 'kibana-event-log-policy',
    indexPattern: '.kibana-event-log-*',
    indexPatternWithVersion: '.kibana-event-log-8.0.0-*',
    initialIndex: '.kibana-event-log-8.0.0-000001',
    indexTemplate: '.kibana-event-log-8.0.0-template',
  };
  return mock;
};

export const namesMock = {
  create: createNamesMock,
};
