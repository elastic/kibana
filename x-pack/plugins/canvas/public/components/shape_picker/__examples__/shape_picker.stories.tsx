/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ShapePicker } from '../shape_picker';

import { shapes } from '../../../../canvas_plugin_src/renderers/shape/shapes';

storiesOf('components/Shapes/ShapePicker', module).add('default', () => (
  <ShapePicker shapes={shapes} onChange={action('onChange')} />
));
