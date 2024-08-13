/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setKibanaServices } from '@kbn/esql/public/kibana_services';
import { coreMock } from '@kbn/core/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';

setKibanaServices(
  coreMock.createStart(),
  dataViewPluginMocks.createStartContract(),
  expressionsPluginMock.createStartContract()
);
