/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addons } from '@storybook/addons';
import { create } from '@storybook/theming';
import { PANEL_ID } from '@storybook/addon-actions';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Canvas Storybook',
    brandUrl: 'https://github.com/elastic/kibana/tree/master/x-pack/plugins/canvas',
  }),
  showPanel: true,
  isFullscreen: false,
  panelPosition: 'bottom',
  isToolshown: true,
  selectedPanel: PANEL_ID,
});
