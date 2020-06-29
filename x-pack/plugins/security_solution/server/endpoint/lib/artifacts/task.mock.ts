/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { taskManagerStartContract } from '../../../../../task_manager/server';

import { taskManagerMock } from '../../../../../task_manager/server/mocks';

import { createMockEndpointAppContext } from '../../mocks';

import { ManifestTask } from './task';

export class MockManifestTask extends ManifestTask {
  private runTask = jest.fn();
}
