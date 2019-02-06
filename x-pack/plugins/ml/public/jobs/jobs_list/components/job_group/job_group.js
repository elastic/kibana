/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { stringHash } from '../../../../../common/util/string_utils';

import PropTypes from 'prop-types';
import React from 'react';

// This should import the colors directly from EUI's palette service rather than be hard coded
const COLORS = [
  '#00B3A4', // euiColorVis0
  '#3185FC', // euiColorVis1
  '#DB1374', // euiColorVis2
  '#490092', // euiColorVis3
  // '#FEB6DB', // euiColorVis4 light pink, too hard to read with white text
  '#E6C220', // euiColorVis5
  '#BFA180', // euiColorVis6
  '#F98510', // euiColorVis7
  '#461A0A', // euiColorVis8
  '#920000', // euiColorVis9

  '#666666', // euiColorDarkShade
  '#0079A5', // euiColorPrimary
];

const colorMap = {};

export function JobGroup({ name }) {
  return (
    <div
      className="inline-group"
      style={{ backgroundColor: tabColor(name) }}
    >
      {name}
    </div>
  );
}
JobGroup.propTypes = {
  name: PropTypes.string.isRequired,
};

// to ensure the same color is always used for a group name
// the color choice is based on a hash of the group name
function tabColor(name) {
  if (colorMap[name] === undefined) {
    const n = stringHash(name);
    const color = COLORS[(n % COLORS.length)];
    colorMap[name] = color;
    return color;
  } else {
    return colorMap[name];
  }
}
