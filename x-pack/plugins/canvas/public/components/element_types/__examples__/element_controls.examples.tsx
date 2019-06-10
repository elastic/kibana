/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ElementControls } from '../element_controls';

storiesOf('components/ElementTypes/ElementControls', module)
  .addDecorator(story => (
    <div
      style={{
        width: '50px',
      }}
    >
      {story()}
    </div>
  ))
  .add('has two buttons', () => (
    <ElementControls onDelete={action('onDelete')} onEdit={action('onEdit')} />
  ));
