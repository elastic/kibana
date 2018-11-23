/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, map } from 'lodash';
import { getType } from '@kbn/interpreter/common/lib/get_type';

export const getFlotAxisConfig = (axis, argValue, { columns, ticks, font } = {}) => {
  if (!argValue || argValue.show === false) return { show: false };

  const config = { show: true };
  const axisType = get(columns, `${axis}.type`);

  if (getType(argValue) === 'axisConfig') {
    const { position, min, max, tickSize } = argValue;
    // first value is used as the default
    const acceptedPositions = axis === 'x' ? ['bottom', 'top'] : ['left', 'right'];

    config.position = acceptedPositions.includes(position) ? position : acceptedPositions[0];

    if (axisType === 'number' || axisType === 'date') {
      if (min) config.min = min;
      if (max) config.max = max;
    }

    if (tickSize && axisType === 'number') config.tickSize = tickSize;
  }

  if (axisType === 'string')
    config.ticks = map(ticks[axis].hash, (position, name) => [position, name]);

  if (axisType === 'date') config.mode = 'time';

  if (typeof font === 'object') config.font = font;

  return config;
};
