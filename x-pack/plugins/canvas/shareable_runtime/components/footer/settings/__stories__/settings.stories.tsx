/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExampleContext } from '../../../../test/context_example';

import { Settings, SettingsComponent } from '../settings';
import { initialCanvasShareableState } from '../../../../context';

storiesOf('shareables/Footer/Settings', module)
  .add('contextual', () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <Settings />
    </ExampleContext>
  ))
  .add('component', () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <SettingsComponent refs={initialCanvasShareableState.refs} />
    </ExampleContext>
  ));
