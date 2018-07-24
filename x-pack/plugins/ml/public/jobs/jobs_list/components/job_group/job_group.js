/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React from 'react';

import './styles/main.less';

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

function stringHash(str) {
  let hash = 0;
  let chr = '';
  if (str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash < 0 ? hash * -2 : hash;
}
