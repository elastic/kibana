/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';

import { CanvasVariable } from '../../../../types';

import { EditVar } from '../edit_var';

const variables: CanvasVariable[] = [
  {
    name: 'homeUrl',
    value: 'https://elastic.co',
    type: 'string',
  },
  {
    name: 'bigNumber',
    value: 1000,
    type: 'number',
  },
  {
    name: 'zenMode',
    value: true,
    type: 'boolean',
  },
];

storiesOf('components/Variables/EditVar', module)
  .add('new variable', () => (
    <EditVar
      variables={variables}
      selectedVar={null}
      onSave={action('onSave')}
      onCancel={action('onCancel')}
    />
  ))
  .add('edit variable (string)', () => (
    <EditVar
      variables={variables}
      selectedVar={variables[0]}
      onSave={action('onSave')}
      onCancel={action('onCancel')}
    />
  ))
  .add('edit variable (number)', () => (
    <EditVar
      variables={variables}
      selectedVar={variables[1]}
      onSave={action('onSave')}
      onCancel={action('onCancel')}
    />
  ))
  .add('edit variable (boolean)', () => (
    <EditVar
      variables={variables}
      selectedVar={variables[2]}
      onSave={action('onSave')}
      onCancel={action('onCancel')}
    />
  ));
