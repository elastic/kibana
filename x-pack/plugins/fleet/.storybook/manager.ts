/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addons } from '@storybook/addons';
import { create } from '@storybook/theming';
import { PANEL_ID } from '@storybook/addon-actions';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Kibana Fleet Storybook',
    brandUrl: 'https://github.com/elastic/kibana/tree/main/x-pack/plugins/fleet',
  }),
  showPanel: true.valueOf,
  selectedPanel: PANEL_ID,
});
