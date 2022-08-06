/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addDecorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { LogicButtons } from './logic_buttons';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

export default {
  title: 'ThreatMatching|LogicButtons',
};

export const AndOrButtons = () => {
  return (
    <LogicButtons
      isAndDisabled={false}
      isOrDisabled={false}
      onOrClicked={action('onClick')}
      onAndClicked={action('onClick')}
    />
  );
};

AndOrButtons.story = {
  name: 'and/or buttons',
};

export const AndDisabled = () => {
  return (
    <LogicButtons
      isAndDisabled
      isOrDisabled={false}
      onOrClicked={action('onClick')}
      onAndClicked={action('onClick')}
    />
  );
};

AndDisabled.story = {
  name: 'and disabled',
};

export const OrDisabled = () => {
  return (
    <LogicButtons
      isAndDisabled={false}
      isOrDisabled
      onOrClicked={action('onClick')}
      onAndClicked={action('onClick')}
    />
  );
};

OrDisabled.story = {
  name: 'or disabled',
};
