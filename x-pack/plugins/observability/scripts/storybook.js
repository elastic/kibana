/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { join } from 'path';

// eslint-disable-next-line
require('@kbn/storybook').runStorybookCli({
  name: 'observability',
  storyGlobs: [
    join(__dirname, '..', 'public', 'components', '**', '*.stories.tsx'),
    join(__dirname, '..', 'public', 'pages', '**', '*.stories.tsx'),
  ],
});
