/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import { ElementGrid } from '../element_grid';
import { getTestCustomElements } from './fixtures/test_elements';

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
  .add(
    'default',
    (_, props) => (
      <ElementGrid
        elements={props?.testCustomElements}
        onClick={action('addCustomElement')}
        onDelete={action('onDelete')}
        onEdit={action('onEdit')}
      />
    ),
    { decorators: [waitFor(getTestCustomElements())] }
  )
  .add(
    'with text filter',
    (_, props) => (
      <ElementGrid
        elements={props?.testCustomElements}
        onClick={action('addCustomElement')}
        filterText="table"
        onDelete={action('onDelete')}
        onEdit={action('onEdit')}
      />
    ),
    { decorators: [waitFor(getTestCustomElements())] }
  );
