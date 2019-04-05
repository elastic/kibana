/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { configure, addDecorator, addParameters } from '@storybook/react';
import { withKnobs } from '@storybook/addon-knobs/react';
import { withInfo } from '@storybook/addon-info';
import { create } from '@storybook/theming';

// Import dependent CSS
require('@elastic/eui/dist/eui_theme_light.css');
require('@kbn/ui-framework/dist/kui_light.css');
require('../../../../src/legacy/ui/public/styles/bootstrap_light.less');

// If we're running Storyshots, be sure to register the require context hook.
// Otherwise, add the other decorators.
if (process.env.NODE_ENV === 'test') {
  require('babel-plugin-require-context-hook/register')();
} else {
  // Customize the info for each story.
  addDecorator(
    withInfo({
      inline: true,
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '40px 60px',
        },
      },
    })
  );

  // Add optional knobs to customize each story.
  addDecorator(withKnobs);
}

function loadStories() {
  // Pull in the built CSS produced by the Kibana server
  const css = require.context('../../../../built_assets/css', true, /light.css$/);
  css.keys().forEach(filename => css(filename));

  // Include the legacy styles
  const uiStyles = require.context(
    '../../../../src/legacy/ui/public/styles',
    false,
    /[\/\\](?!mixins|variables|_|\.|bootstrap_(light|dark))[^\/\\]+\.less/
  );
  uiStyles.keys().forEach(key => uiStyles(key));

  // Find all files ending in *.examples.ts
  const req = require.context('./..', true, /.examples.tsx$/);
  req.keys().forEach(filename => req(filename));
}

// Set up the Storybook environment with custom settings.
addParameters({
  options: {
    theme: create({
      base: 'light',
      brandTitle: 'Canvas Storybook',
      brandUrl: 'https://github.com/elastic/kibana/tree/master/x-pack/plugins/canvas',
    }),
    showPanel: true,
    isFullscreen: false,
    panelPosition: 'bottom',
    isToolshown: true,
  },
});

configure(loadStories, module);
