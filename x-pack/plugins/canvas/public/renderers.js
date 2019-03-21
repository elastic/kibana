/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderersRegistry } from 'plugins/interpreter/registries';
import { renderFunctions } from '../canvas_plugin_src/renderers';

renderFunctions.forEach(r => {
  renderersRegistry.register(r);
});

export default renderFunctions;
