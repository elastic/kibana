/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManifestTask } from './task';

export class MockManifestTask extends ManifestTask {
  public runTask = jest.fn();
}
