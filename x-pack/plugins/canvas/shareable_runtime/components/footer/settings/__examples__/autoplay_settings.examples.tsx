/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ExampleContext } from '../../../../test/context_example';

import { AutoplaySettings, AutoplaySettingsComponent } from '../autoplay_settings';

const style = {
  width: 256,
  height: 228,
  padding: 16,
  border: '1px solid #ccc',
  background: '#fff',
};

storiesOf('shareables/Footer/Settings/AutoplaySettings', module)
  .add('contextual', () => (
    <ExampleContext {...{ style }}>
      <AutoplaySettings />
    </ExampleContext>
  ))
  .add('component: off, 2s', () => (
    <ExampleContext {...{ style }}>
      <AutoplaySettingsComponent
        isEnabled={false}
        interval="2s"
        onSetAutoplay={action('onSetAutoplay')}
        onSetInterval={action('onSetInterval')}
      />
    </ExampleContext>
  ))
  .add('component: on, 5s', () => (
    <ExampleContext {...{ style }}>
      <AutoplaySettingsComponent
        isEnabled={true}
        interval="5s"
        onSetAutoplay={action('onSetAutoplay')}
        onSetInterval={action('onSetInterval')}
      />
    </ExampleContext>
  ));
