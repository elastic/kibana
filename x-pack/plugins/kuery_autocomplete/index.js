/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';


export const kueryAutocomplete = (kibana) => new kibana.Plugin({
  id: 'kuery_autocomplete',
  publicDir: resolve(__dirname, 'public'),
  uiExports: {
    autocompleteProviders: [
      'plugins/kuery_autocomplete/autocomplete_providers'
    ],
  }
});
