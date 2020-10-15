/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidHex } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';

export const DEFAULT_CUSTOM_COLOR = '#FF0000';
export const DEFAULT_NEXT_COLOR = '#00FF00';

export function removeRow(colorStops, index) {
  if (colorStops.length === 1) {
    return colorStops;
  }

  return [...colorStops.slice(0, index), ...colorStops.slice(index + 1)];
}

export function addOrdinalRow(colorStops, index) {
  const currentStop = colorStops[index].stop;
  let delta = 1;
  if (index === colorStops.length - 1) {
    // Adding row to end of list.
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop;
      delta = currentStop - prevStop;
    }
  } else {
    // Adding row in middle of list.
    const nextStop = colorStops[index + 1].stop;
    delta = (nextStop - currentStop) / 2;
  }
  const nextValue = currentStop + delta;
  return addRow(colorStops, index, nextValue);
}

export function addCategoricalRow(colorStops, index) {
  const currentStop = colorStops[index].stop;
  const nextValue = currentStop === '' ? currentStop + 'a' : '';
  return addRow(colorStops, index, nextValue);
}

function addRow(colorStops, index, nextValue) {
  const newRow = {
    stop: nextValue,
    color: DEFAULT_CUSTOM_COLOR,
  };
  return [...colorStops.slice(0, index + 1), newRow, ...colorStops.slice(index + 1)];
}

export function isColorInvalid(color) {
  return !isValidHex(color) || color === '';
}

export function isOrdinalStopInvalid(stop) {
  return stop === '' || isNaN(stop);
}

export function isCategoricalStopsInvalid(colorStops) {
  const nonDefaults = colorStops.slice(1); //
  const values = nonDefaults.map((stop) => stop.stop);
  const uniques = _.uniq(values);
  return values.length !== uniques.length;
}

export function isOrdinalStopsInvalid(colorStops) {
  return colorStops.some((colorStop, index) => {
    // expect stops to be in ascending order
    let isDescending = false;
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop;
      isDescending = prevStop >= colorStop.stop;
    }

    return isColorInvalid(colorStop.color) || isOrdinalStopInvalid(colorStop.stop) || isDescending;
  });
}

export function getOtherCategoryLabel() {
  return i18n.translate('xpack.maps.styles.categorical.otherCategoryLabel', {
    defaultMessage: 'Other',
  });
}
