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

export default {
  title: 'shareables/Footer/Settings/AutoplaySettings',
};

export const Contextual = () => (
  <ExampleContext {...{ style }}>
    <AutoplaySettings />
  </ExampleContext>
);

Contextual.story = {
  name: 'contextual',
};

export const ComponentOff2S = () => (
  <ExampleContext {...{ style }}>
    <AutoplaySettingsComponent
      isEnabled={false}
      interval="2s"
      onSetAutoplay={action('onSetAutoplay')}
      onSetInterval={action('onSetInterval')}
    />
  </ExampleContext>
);

ComponentOff2S.story = {
  name: 'component: off, 2s',
};

export const ComponentOn5S = () => (
  <ExampleContext {...{ style }}>
    <AutoplaySettingsComponent
      isEnabled={true}
      interval="5s"
      onSetAutoplay={action('onSetAutoplay')}
      onSetInterval={action('onSetInterval')}
    />
  </ExampleContext>
);

ComponentOn5S.story = {
  name: 'component: on, 5s',
};
