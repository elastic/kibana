/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SidebarHeader } from '../sidebar_header';

const handlers = {
  bringToFront: action('bringToFront'),
  bringForward: action('bringForward'),
  sendBackward: action('sendBackward'),
  sendToBack: action('sendToBack'),
};

storiesOf('components/Sidebar/SidebarHeader', module)
  .addDecorator((story) => <div style={{ width: '300px' }}>{story()}</div>)
  .add('default', () => <SidebarHeader title="Selected layer" {...handlers} />)
  .add('with layer controls', () => (
    <SidebarHeader title="Grouped element" showLayerControls={true} {...handlers} />
  ));
