/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';

require('@kbn/storybook').runStorybookCli({
  name: 'siem',
  storyGlobs: [join(__dirname, '..', 'public', '**', '*.stories.tsx')],
});
