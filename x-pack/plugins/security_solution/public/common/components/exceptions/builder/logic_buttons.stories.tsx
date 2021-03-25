/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf, addDecorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import { BuilderLogicButtons } from './logic_buttons';

addDecorator((storyFn) => <EuiThemeProvider darkMode={false}>{storyFn()}</EuiThemeProvider>);

storiesOf('Exceptions/BuilderLogicButtons', module)
  .add('and/or buttons', () => {
    return (
      <BuilderLogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested={false}
        showNestedButton={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
        onAddClickWhenNested={action('onClick')}
      />
    );
  })
  .add('nested button - isNested false', () => {
    return (
      <BuilderLogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested={false}
        showNestedButton
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
        onAddClickWhenNested={action('onClick')}
      />
    );
  })
  .add('nested button - isNested true', () => {
    return (
      <BuilderLogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested
        showNestedButton
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
        onAddClickWhenNested={action('onClick')}
      />
    );
  })
  .add('and disabled', () => {
    return (
      <BuilderLogicButtons
        isAndDisabled
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested={false}
        showNestedButton={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
        onAddClickWhenNested={action('onClick')}
      />
    );
  })
  .add('or disabled', () => {
    return (
      <BuilderLogicButtons
        isAndDisabled={false}
        isOrDisabled
        isNestedDisabled={false}
        isNested={false}
        showNestedButton={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
        onAddClickWhenNested={action('onClick')}
      />
    );
  })
  .add('nested disabled', () => {
    return (
      <BuilderLogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled
        isNested={false}
        showNestedButton
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
        onNestedClicked={action('onClick')}
        onAddClickWhenNested={action('onClick')}
      />
    );
  });
