/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Shape } from '@kbn/expression-shape-plugin/public';
import { ShapePreview } from '../shape_preview';

export default {
  title: 'components/Shapes/ShapePreview',
};

export const Arrow = () => <ShapePreview shape={Shape.ARROW} />;

Arrow.story = {
  name: 'arrow',
};

export const Square = () => <ShapePreview shape={Shape.SQUARE} />;

Square.story = {
  name: 'square',
};
