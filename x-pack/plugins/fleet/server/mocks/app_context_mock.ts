/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsServiceMock,
} from '../../../../../src/core/server/mocks';
import type { FleetAppContext } from '../plugin';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { securityMock } from '../../../security/server/mocks';

export const createAppContextStartContractMock = (): FleetAppContext => {
  return {
    elasticsearch: elasticsearchServiceMock.createStart(),
    encryptedSavedObjectsStart: encryptedSavedObjectsMock.createStart(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    security: securityMock.createStart(),
    logger: loggingSystemMock.create().get(),
    isProductionMode: true,
    kibanaVersion: '8.0.0',
    kibanaBranch: 'master',
  };
};
