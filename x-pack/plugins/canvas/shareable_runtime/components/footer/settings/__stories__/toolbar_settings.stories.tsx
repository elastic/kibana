import { action } from '@storybook/addon-actions';
import React from 'react';
import { ExampleContext } from '../../../../test/context_example';

import { ToolbarSettings, ToolbarSettingsComponent } from '../toolbar_settings';

const style = {
  width: 256,
  height: 124,
  padding: 16,
  border: '1px solid #ccc',
  background: '#fff',
};

export default {
  title: 'shareables/Footer/Settings/ToolbarSettings',
};

export const Contextual = () => (
  <ExampleContext {...{ style }}>
    <ToolbarSettings onSetAutohide={action('onSetAutohide')} />
  </ExampleContext>
);

Contextual.story = {
  name: 'contextual',
};

export const ComponentOn = () => (
  <ExampleContext {...{ style }}>
    <ToolbarSettingsComponent isAutohide={true} onSetAutohide={action('onSetAutohide')} />
  </ExampleContext>
);

ComponentOn.story = {
  name: 'component: on',
};

export const ComponentOff = () => (
  <ExampleContext {...{ style }}>
    <ToolbarSettingsComponent isAutohide={false} onSetAutohide={action('onSetAutohide')} />
  </ExampleContext>
);

ComponentOff.story = {
  name: 'component: off',
};
