/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import { reduxDecorator, getAddonPanelParameters } from '../../../../storybook';

import { AssetManager, AssetManagerComponent } from '..';
import { assets } from './assets';

storiesOf('components/Assets/AssetManager', module)
  .addDecorator(reduxDecorator({ assets }))
  .addParameters(getAddonPanelParameters())
  .add('redux: AssetManager', () => <AssetManager onClose={action('onClose')} />)
  .add('no assets', () => (
    <AssetManagerComponent
      assets={[]}
      onClose={action('onClose')}
      onAddAsset={action('onAddAsset')}
    />
  ))
  .add('two assets', () => (
    <AssetManagerComponent
      assets={assets}
      onClose={action('onClose')}
      onAddAsset={action('onAddAsset')}
    />
  ));
