/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import { Asset, AssetComponent } from '../';
import { Provider, AIRPLANE, MARKER } from './provider';

storiesOf('components/Assets/Asset', module)
  .addDecorator((story) => <div style={{ width: '215px' }}>{story()}</div>)
  .add('redux: Asset', () => {
    return (
      <Provider>
        <Asset asset={AIRPLANE} />
      </Provider>
    );
  })
  .add('airplane', () => (
    <AssetComponent asset={AIRPLANE} onCreate={action('onCreate')} onDelete={action('onDelete')} />
  ))
  .add('marker', () => (
    <AssetComponent asset={MARKER} onCreate={action('onCreate')} onDelete={action('onDelete')} />
  ));
