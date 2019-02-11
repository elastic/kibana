/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { configure, setAddon, addDecorator } from '@storybook/react';
import { withKnobs } from '@storybook/addon-knobs/react';
import { withInfo } from '@storybook/addon-info';
import { withOptions } from '@storybook/addon-options';

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
          margin: 20
        },
        infoStory: {
          margin: '40px 60px'
        }
      }
    })
  );

  // Add optional knobs to customize each story.
  addDecorator(withKnobs);
}

// Automatically import all files ending in *.examples.ts
const req = require.context('./..', true, /.examples.tsx$/);

function loadStories() {
  req.keys().forEach(filename => req(filename));
}

// Set up the Storybook environment with custom settings.
addDecorator(
  withOptions({
    goFullScreen: false,
    name: 'Canvas Storybook',
    showAddonsPanel: true,
    url: 'https://github.com/elastic/kibana/tree/master/x-pack/plugins/canvas'
  })
);

configure(loadStories, module);
