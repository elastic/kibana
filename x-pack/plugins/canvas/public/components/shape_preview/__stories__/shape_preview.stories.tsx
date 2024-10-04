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
