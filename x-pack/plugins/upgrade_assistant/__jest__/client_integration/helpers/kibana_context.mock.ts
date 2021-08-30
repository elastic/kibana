/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { applicationServiceMock } from '../../../../../../src/core/public/application/application_service.mock';

export const kibanaContextMock = {
  data: dataPluginMock.createStartContract(),
  application: applicationServiceMock.createStartContract(),
};
