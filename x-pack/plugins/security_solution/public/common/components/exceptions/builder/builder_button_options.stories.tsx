/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf, addDecorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { BuilderButtonOptions } from './builder_button_options';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

storiesOf('Components|Exceptions|BuilderButtonOptions', module)
  .add('init button', () => {
    return (
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled={false}
        showNestedButton={false}
        displayInitButton
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
      />
    );
  })
  .add('and/or buttons', () => {
    return (
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled={false}
        showNestedButton={false}
        displayInitButton={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
      />
    );
  })
  .add('nested button', () => {
    return (
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled={false}
        showNestedButton
        displayInitButton={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
      />
    );
  })
  .add('and disabled', () => {
    return (
      <BuilderButtonOptions
        isAndDisabled
        isOrDisabled={false}
        showNestedButton={false}
        displayInitButton={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
      />
    );
  })
  .add('or disabled', () => {
    return (
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled
        showNestedButton={false}
        displayInitButton={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
      />
    );
  });
