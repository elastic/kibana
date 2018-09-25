/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pluginsLoadingState } from 'plugins/interpreter/plugins_loading_state';
import { loadBrowserPlugins } from './load_browser_plugins';

const identifier = pluginsLoadingState.setLoading();
loadBrowserPlugins().then(() => {
  pluginsLoadingState.setComplete(identifier);
});
