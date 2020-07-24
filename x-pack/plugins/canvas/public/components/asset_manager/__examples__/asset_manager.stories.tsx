/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';

import { AssetManager, AssetManagerComponent } from '../';

import { Provider, AIRPLANE, MARKER } from './provider';

storiesOf('components/Assets/AssetManager', module)
  .add('redux: AssetManager', () => (
    <Provider>
      <AssetManager onClose={action('onClose')} />
    </Provider>
  ))
  .add('no assets', () => (
    <Provider>
      <AssetManagerComponent
        assets={[]}
        onClose={action('onClose')}
        onAddAsset={action('onAddAsset')}
      />
    </Provider>
  ))
  .add('two assets', () => (
    <Provider>
      <AssetManagerComponent
        assets={[AIRPLANE, MARKER]}
        onClose={action('onClose')}
        onAddAsset={action('onAddAsset')}
      />
    </Provider>
  ));
