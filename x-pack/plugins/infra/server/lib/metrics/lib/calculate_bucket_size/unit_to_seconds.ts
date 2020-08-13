/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy, isNumber } from 'lodash';
import { INTERVAL_STRING_RE } from './interval_regex';

export const ASCENDING_UNIT_ORDER = ['ms', 's', 'm', 'h', 'd', 'w', 'M', 'y'];

const units: Record<string, number> = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 86400 * 7,
  M: 86400 * 30,
  y: 86400 * 365,
};

const sortedUnits = sortBy(Object.keys(units), (key) => units[key]);

export const parseInterval = (intervalString: string) => {
  let value;
  let unit;

  if (intervalString) {
    const matches = intervalString.match(INTERVAL_STRING_RE);

    if (matches) {
      value = Number(matches[1]);
      unit = matches[2];
    }
  }

  return { value, unit };
};

export const convertIntervalToUnit = (intervalString: string, newUnit: string) => {
  const parsedInterval = parseInterval(intervalString);
  let value;
  let unit;

  if (parsedInterval.unit && parsedInterval.value && units[newUnit]) {
    value = Number(
      ((parsedInterval.value * units[parsedInterval.unit]) / units[newUnit]).toFixed(2)
    );
    unit = newUnit;
  }

  return { value, unit };
};

export const getSuitableUnit = (intervalInSeconds: number) =>
  sortedUnits.find((key, index, array) => {
    const nextUnit = array[index + 1];
    const isValidInput = isNumber(intervalInSeconds) && intervalInSeconds > 0;
    const isLastItem = index + 1 === array.length;

    return (
      isValidInput &&
      ((intervalInSeconds >= units[key] && intervalInSeconds < units[nextUnit]) || isLastItem)
    );
  });

export const getUnitValue = (unit: string) => units[unit];
