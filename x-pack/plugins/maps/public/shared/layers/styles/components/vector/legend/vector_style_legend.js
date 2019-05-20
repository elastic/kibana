/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { styleOptionShapes, rangeShape } from '../style_option_shapes';
import { StylePropertyLegendRow } from './style_property_legend_row';

export function VectorStyleLegend({ styleProperties }) {
  return styleProperties.map(styleProperty => {
    return (
      <StylePropertyLegendRow
        key={styleProperty.name}
        name={styleProperty.name}
        type={styleProperty.type}
        options={styleProperty.options}
        range={styleProperty.range}
      />
    );
  });
}

const stylePropertyShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  options: PropTypes.oneOfType(styleOptionShapes).isRequired,
  range: rangeShape,
});

VectorStyleLegend.propTypes = {
  styleProperties: PropTypes.arrayOf(stylePropertyShape).isRequired
};
