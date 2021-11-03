/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { addons, types } from '@storybook/addons';
import { AddonPanel } from '@storybook/components';
import { STORY_CHANGED } from '@storybook/core-events';
import { create } from '@storybook/theming';
import { PANEL_ID } from '@storybook/addon-actions';

import { ADDON_ID, EVENTS, ACTIONS_PANEL_ID } from './constants';
import { Panel } from './panel';

addons.register(ADDON_ID, (api) => {
  const channel = addons.getChannel();

  api.on(STORY_CHANGED, (storyId) => {
    channel.emit(EVENTS.RESET, storyId);
  });

  addons.add(ACTIONS_PANEL_ID, {
    title: 'Redux Actions',
    type: types.PANEL,
    render: ({ active, key }) => {
      return (
        <AddonPanel active={!!active} key={key}>
          <Panel />
        </AddonPanel>
      );
    },
  });
});

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Canvas Storybook',
    brandUrl: 'https://github.com/elastic/kibana/tree/main/x-pack/plugins/canvas',
  }),
  showPanel: true,
  isFullscreen: false,
  panelPosition: 'bottom',
  isToolshown: true,
  selectedPanel: PANEL_ID,
});
