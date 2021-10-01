/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';

import { CanvasVariable } from '../../../../types';

import { DeleteVar } from '../delete_var';

const variable: CanvasVariable = {
  name: 'homeUrl',
  value: 'https://elastic.co',
  type: 'string',
};

storiesOf('components/Variables/DeleteVar', module).add('default', () => (
  <DeleteVar selectedVar={variable} onDelete={action('onDelete')} onCancel={action('onCancel')} />
));
