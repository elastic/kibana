import '@storybook/addon-actions/register';
import '@storybook/addon-knobs/register';
import '@storybook/addon-console';
import 'storybook-addon-jsx/register';

import { addDecorator } from '@storybook/react';
import { withOptions } from '@storybook/addon-options';

addDecorator(
  withOptions({
    name: 'Canvas Storybook',
    goFullScreen: false,
    showAddonsPanel: true,
  })
);