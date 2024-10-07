/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
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

export default {
  title: 'components/Variables/EditVar',
};

export const NewVariable = () => (
  <EditVar
    variables={variables}
    selectedVar={null}
    onSave={action('onSave')}
    onCancel={action('onCancel')}
  />
);

NewVariable.story = {
  name: 'new variable',
};

export const EditVariableString = () => (
  <EditVar
    variables={variables}
    selectedVar={variables[0]}
    onSave={action('onSave')}
    onCancel={action('onCancel')}
  />
);

EditVariableString.story = {
  name: 'edit variable (string)',
};

export const EditVariableNumber = () => (
  <EditVar
    variables={variables}
    selectedVar={variables[1]}
    onSave={action('onSave')}
    onCancel={action('onCancel')}
  />
);

EditVariableNumber.story = {
  name: 'edit variable (number)',
};

export const EditVariableBoolean = () => (
  <EditVar
    variables={variables}
    selectedVar={variables[2]}
    onSave={action('onSave')}
    onCancel={action('onCancel')}
  />
);

EditVariableBoolean.story = {
  name: 'edit variable (boolean)',
};
