/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IngestManagerSetupDeps, IngestManagerStartDeps } from '../../../plugin';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { licensingMock } from '../../../../../licensing/public/mocks';
import { homePluginMock } from '../../../../../../../src/plugins/home/public/mocks';

export const createSetupDepsMock = (): IngestManagerSetupDeps => {
  return {
    licensing: licensingMock.createSetup(),
    data: dataPluginMock.createSetupContract(),
    home: homePluginMock.createSetupContract(),
  };
};

export const createStartDepsMock = (): IngestManagerStartDeps => {
  return {
    data: dataPluginMock.createStartContract(),
  };
};
