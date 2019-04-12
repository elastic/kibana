/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import mappings from './mappings.json';

export const advancedEmbeddableApi = (kibana: any) => {
  return new kibana.Plugin({
    id: 'advanced_embeddable_api',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'xpack_main'],
    uiExports: {
      mappings,
      embeddableActions: [
        'plugins/advanced_embeddable_api/actions',
        'plugins/advanced_embeddable_api/dynamic_actions/inject_dynamic_actions',
      ],
      embeddableFactories: [
        'plugins/advanced_embeddable_api/user_embeddable/user_embeddable_factory',
        'plugins/advanced_embeddable_api/users_embeddable/users_embeddable_factory',
      ],
    },
  });
};
