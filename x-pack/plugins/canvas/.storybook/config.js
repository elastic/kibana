/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { configure, addDecorator, addParameters } from '@storybook/react';
import { withKnobs } from '@storybook/addon-knobs/react';
import { withInfo } from '@storybook/addon-info';
import { create } from '@storybook/theming';

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
  require('./dll_contexts');

  // Only gather and require CSS files related to Canvas.  The other CSS files
  // are built into the DLL.
  const css = require.context(
    '../../../../built_assets/css',
    true,
    /plugins\/(?=canvas).*light\.css/
  );
  css.keys().forEach(filename => css(filename));

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
