/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getLegendConfig = (legend, size) => {
  if (!legend || size < 2) {
    return { show: false };
  }

  const config = {
    show: true,
    backgroundOpacity: 0,
    labelBoxBorderColor: 'transparent',
  };

  const acceptedPositions = ['nw', 'ne', 'sw', 'se'];

  config.position = !legend || acceptedPositions.includes(legend) ? legend : 'ne';

  return config;
};
