import React from 'react';
import PropTypes from 'prop-types';
import { shapes } from '../../../canvas_plugin_src/renderers/shape/shapes';

export const ShapePreview = ({ value }) => {
  // eslint-disable-next-line react/no-danger
  return <div className="canvasShapePreview" dangerouslySetInnerHTML={{ __html: shapes[value] }} />;
};

ShapePreview.propTypes = {
  value: PropTypes.string,
};
