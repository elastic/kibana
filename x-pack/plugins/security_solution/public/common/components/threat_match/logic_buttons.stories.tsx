/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf, addDecorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { LogicButtons } from './logic_buttons';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

storiesOf('ThreatMatching|LogicButtons', module)
  .add('and/or buttons', () => {
    return (
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
      />
    );
  })
  .add('and disabled', () => {
    return (
      <LogicButtons
        isAndDisabled
        isOrDisabled={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
      />
    );
  })
  .add('or disabled', () => {
    return (
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
      />
    );
  });
