/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { toastNotifications } from 'ui/notify';
import { getIndexPatternDatasource } from './indexpattern';

class IndexPatternDatasourcePlugin {
  constructor() {}

  setup() {
    return getIndexPatternDatasource(chrome, toastNotifications);
  }

  stop() {}
}

const plugin = new IndexPatternDatasourcePlugin();

export const indexPatternDatasourceSetup = () => plugin.setup();
export const indexPatternDatasourceStop = () => plugin.stop();
