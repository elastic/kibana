/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { CoreStart } from '../../../../../src/core/public';
import { routes } from './routes';
import { StartPlugins } from '../types';
import { SecuritySubPlugin } from '../app/types';

export class CloudPosture {
  public setup() {}
  public start(storage: Storage, core: CoreStart, plugins: StartPlugins): SecuritySubPlugin {
    return {
      storageTimelines: {
        timelineById: {},
      },
      routes,
    };
  }
}
