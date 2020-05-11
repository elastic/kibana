/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { coreMock } from '../../../../../../src/core/public/mocks';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';

export const createKibanaCoreStartMock = () => coreMock.createStart();
export const createKibanaPluginsStartMock = () => ({
  data: dataPluginMock.createStartContract(),
});
