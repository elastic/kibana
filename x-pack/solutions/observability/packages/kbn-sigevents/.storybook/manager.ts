/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addons } from '@storybook/manager-api';

addons.setConfig({
  initialActive: 'canvas',
  sidebar: {
    showRoots: true,
  },
});

// Navigate to the overview story on initial load
const url = new URL(window.location.href);
if (!url.searchParams.has('path')) {
  url.searchParams.set(
    'path',
    '/story/app-sigeventsoverview-sigeventsoverview--act-0-no-detection-workflows'
  );
  window.history.replaceState(null, '', url.toString());
}
