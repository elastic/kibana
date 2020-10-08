/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ElementGrid } from '../element_grid';
import { testCustomElements } from './fixtures/test_elements';

storiesOf('components/SavedElementsModal/ElementGrid', module)
  .addDecorator((story) => (
    <div
      style={{
        width: '1000px',
      }}
    >
      {story()}
    </div>
  ))
  .add('default', () => (
    <ElementGrid
      elements={testCustomElements}
      onClick={action('addCustomElement')}
      onDelete={action('onDelete')}
      onEdit={action('onEdit')}
    />
  ))
  .add('with text filter', () => (
    <ElementGrid
      elements={testCustomElements}
      onClick={action('addCustomElement')}
      filterText="table"
      onDelete={action('onDelete')}
      onEdit={action('onEdit')}
    />
  ));
