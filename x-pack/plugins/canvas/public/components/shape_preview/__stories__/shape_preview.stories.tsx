/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { ShapePreview } from '../shape_preview';
import { Shape } from '../../../../../../../src/plugins/expression_shape/public';

storiesOf('components/Shapes/ShapePreview', module)
  .add('arrow', () => <ShapePreview shape={Shape.ARROW} />)
  .add('square', () => <ShapePreview shape={Shape.SQUARE} />);
