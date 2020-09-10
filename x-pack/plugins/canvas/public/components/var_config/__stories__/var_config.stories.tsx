/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';

import { CanvasVariable } from '../../../../types';

import { VarConfig } from '../var_config';

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

storiesOf('components/Variables/VarConfig', module).add('default', () => (
  <VarConfig
    variables={variables}
    onCopyVar={action('onCopyVar')}
    onDeleteVar={action('onDeleteVar')}
    onAddVar={action('onAddVar')}
    onEditVar={action('onEditVar')}
  />
));
