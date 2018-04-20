/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Set the {@code legend} using the supplied data {@code index} in each series.
 *
 * @param datasets {Array} The plot's datasets.
 * @param index {number} The index of the data to show in each series.
 * @param callback {Function} The function to handle the calculation
 */
export function getValuesForSeriesIndex(datasets, index, callback) {
  for (let i = 0; i < datasets.length; i++) {
    const series = datasets[i];
    const data = series.data;

    let y = null;

    if (data.length > index && data[index]) {
      y = data[index][1];
    }

    callback(series.id, y);
  }
}

/**
 * Set the {@code legend} by finding the closest {@code x} coordinate.
 *
 * Note: This method assumes that all series in the same plot are either equal, or they are empty. This may not be
 * true when we add swappable charts with user-selected values in each chart (if the values don't come from the same
 * documents in the same indices, then it's not guaranteed)! This assumption is currently true for all charts.
 *
 * The fix for that is to perform this check per series rather than per plot, and to perform it on the
 * {@code item.datapoint[0]} value from the plotHover event instead of its raw index value.
 *
 * @param datasets {Array} The plot's datasets.
 * @param x {number} The X coordinate of the cursor.
 * @param callback {Function} The callback to handle the calculation
 */
export function getValuesByX(datasets, x, callback) {
  // Check each dataset for the closest point; first one to match wins!
  // Note: All datasets _should_ have the same X coordinates
  for (let i = 0; i < datasets.length; i++) {
    const index = findIndexByX(datasets[i].data, x);

    // It's possible that a given dataset is blank, so we just go onto the next one
    if (index !== -1) {
      getValuesForSeriesIndex(datasets, index, callback);
      break;
    }
  }
}

/**
 * Find the closest index to the {@code x} coordinate within the current series {@code data}.
 *
 * @param data {Array} Series array from the plot.
 * @param x {number} The X coordinate of the cursor.
 * @returns {number} -1 if none.
 */
export function findIndexByX(data, x) {
  const length = data.length;

  if (length === 1) {
    return 0;
  } else if (length !== 0) {
    let prev = null;

    // we need to record previous, if it exists
    if (data[0]) {
      prev = 0;
    }

    // Nearest point (note we start at 1, not 0 because we always look backward)
    for (let j = 1; j < length; ++j) {
      if (data[j]) {
        if (data[j][0] > x) {
          const currentDistance = data[j][0] - x;

          // see if the previous point was actually closer to the X position
          if (prev !== null && currentDistance > Math.abs(x - data[prev][0])) {
            return prev;
          }
          return j;
        }

        prev = j;
      }
    }
  }

  // note: if length is 0, then it's -1; if it's not, then the last index is returned
  return length - 1;
}
