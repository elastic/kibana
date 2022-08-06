/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import { ElementGrid } from '../element_grid';
import { getTestCustomElements } from './fixtures/test_elements';

export default {
  title: 'components/SavedElementsModal/ElementGrid',

  decorators: [
    (story) => (
      <div
        style={{
          width: '1000px',
        }}
      >
        {story()}
      </div>
    ),
  ],
};

export const Default = (_, props) => (
  <ElementGrid
    elements={props?.testCustomElements}
    onClick={action('addCustomElement')}
    onDelete={action('onDelete')}
    onEdit={action('onEdit')}
  />
);

Default.story = {
  name: 'default',
  decorators: [waitFor(getTestCustomElements())],
};

export const WithTextFilter = (_, props) => (
  <ElementGrid
    elements={props?.testCustomElements}
    onClick={action('addCustomElement')}
    filterText="table"
    onDelete={action('onDelete')}
    onEdit={action('onEdit')}
  />
);

WithTextFilter.story = {
  name: 'with text filter',
  decorators: [waitFor(getTestCustomElements())],
};
