/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { LicenseCheck } from '@kbn/licensing-plugin/server';

import { defineQueryRolesRoutes } from './query';
import { routeDefinitionParamsMock } from '../../index.mock';

describe('Query roles', () => {

});
