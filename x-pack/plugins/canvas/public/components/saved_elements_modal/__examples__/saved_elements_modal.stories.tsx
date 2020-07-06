/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SavedElementsModal } from '../saved_elements_modal';
import { testCustomElements } from './fixtures/test_elements';
import { CustomElement } from '../../../../types';

storiesOf('components/SavedElementsModal', module)
  .add('no custom elements', () => (
    <SavedElementsModal
      customElements={[] as CustomElement[]}
      search=""
      setSearch={action('setSearch')}
      onClose={action('onClose')}
      addCustomElement={action('addCustomElement')}
      findCustomElements={action('findCustomElements')}
      updateCustomElement={action('updateCustomElement')}
      removeCustomElement={action('removeCustomElement')}
    />
  ))
  .add('with custom elements', () => (
    <SavedElementsModal
      customElements={testCustomElements}
      search=""
      setSearch={action('setSearch')}
      onClose={action('onClose')}
      addCustomElement={action('addCustomElement')}
      findCustomElements={action('findCustomElements')}
      updateCustomElement={action('updateCustomElement')}
      removeCustomElement={action('removeCustomElement')}
    />
  ))
  .add('with text filter', () => (
    <SavedElementsModal
      customElements={testCustomElements}
      search="Element 2"
      onClose={action('onClose')}
      setSearch={action('setSearch')}
      addCustomElement={action('addCustomElement')}
      findCustomElements={action('findCustomElements')}
      updateCustomElement={action('updateCustomElement')}
      removeCustomElement={action('removeCustomElement')}
    />
  ));
