/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { join } from 'path';

// eslint-disable-next-line
require('@kbn/storybook').runStorybookCli({
  name: 'ui_actions_enhanced',
  storyGlobs: [
    join(__dirname, '..', 'public', 'components', '**', '*.story.tsx'),
    join(__dirname, '..', 'public', 'drilldowns', 'components', '**', '*.story.tsx'),
  ],
});
