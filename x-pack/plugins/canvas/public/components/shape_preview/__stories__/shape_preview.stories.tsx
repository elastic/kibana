import React from 'react';
import { Shape } from '@kbn/expression-shape-plugin/public';
import { ShapePreview } from '../shape_preview';

export default {
  title: 'components/Shapes/ShapePreview',
};

export const Arrow = {
  render: () => <ShapePreview shape={Shape.ARROW} />,
  name: 'arrow',
};

export const Square = {
  render: () => <ShapePreview shape={Shape.SQUARE} />,
  name: 'square',
};
