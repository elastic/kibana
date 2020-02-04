/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';

import { ConsoleSetup } from '../../../../src/plugins/console/public';
import * as savedObjectsStorageClient from './lib/saved_objects_object_storage_client';

interface SetupDependencies {
  console: ConsoleSetup;
}

export class ConsoleExtensionsPublicPlugin implements Plugin {
  setup({ http }: CoreSetup, { console }: SetupDependencies) {
    console.setObjectStorageClient(savedObjectsStorageClient.create({ http }));
  }

  start() {}
}
