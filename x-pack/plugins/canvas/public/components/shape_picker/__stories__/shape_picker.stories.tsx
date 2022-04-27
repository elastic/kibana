/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { getAvailableShapes } from '@kbn/expression-shape-plugin/common';
import { ShapePicker } from '../shape_picker';

storiesOf('components/Shapes/ShapePicker', module).add('default', () => (
  <ShapePicker shapes={getAvailableShapes()} onChange={action('onChange')} />
));
