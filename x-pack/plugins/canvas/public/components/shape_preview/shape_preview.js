/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
