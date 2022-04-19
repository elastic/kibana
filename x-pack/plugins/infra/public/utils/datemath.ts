/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath, { Unit } from '@kbn/datemath';

const JS_MAX_DATE = 8640000000000000;

export function isValidDatemath(value: string): boolean {
  const parsedValue = dateMath.parse(value);
  return !!(parsedValue && parsedValue.isValid());
}

export function datemathToEpochMillis(value: string, round: 'down' | 'up' = 'down'): number | null {
  const parsedValue = dateMath.parse(value, { roundUp: round === 'up' });
  if (!parsedValue || !parsedValue.isValid()) {
    return null;
  }
  return parsedValue.valueOf();
}

type DatemathExtension =
  | {
      value: string;
      diffUnit: Unit;
      diffAmount: number;
    }
  | { value: 'now' };

const datemathNowExpression = /(\+|\-)(\d+)(ms|s|m|h|d|w|M|y)$/;

/**
 * Extend a datemath value
 * @param value The value to extend
 * @param {'before' | 'after'} direction Should the value move before or after in time
 * @param oppositeEdge For absolute values, the value of the other edge of the range
 */
export function extendDatemath(
  value: string,
  direction: 'before' | 'after' = 'before',
  oppositeEdge?: string
): DatemathExtension | undefined {
  if (!isValidDatemath(value)) {
    return undefined;
  }

  // `now` cannot be extended
  if (value === 'now') {
    return { value: 'now' };
  }

  // The unit is relative
  if (value.startsWith('now')) {
    return extendRelativeDatemath(value, direction);
  } else if (oppositeEdge && isValidDatemath(oppositeEdge)) {
    return extendAbsoluteDatemath(value, direction, oppositeEdge);
  }

  return undefined;
}

function extendRelativeDatemath(
  value: string,
  direction: 'before' | 'after'
): DatemathExtension | undefined {
  const [, operator, amount, unit] = datemathNowExpression.exec(value) || [];
  if (!operator || !amount || !unit) {
    return undefined;
  }

  const mustIncreaseAmount =
    (operator === '-' && direction === 'before') || (operator === '+' && direction === 'after');
  const parsedAmount = parseInt(amount, 10);
  let newUnit: Unit = unit as Unit;
  let newAmount: number;

  // Extend the amount
  switch (unit) {
    // For small units, always double or halve the amount
    case 'ms':
    case 's':
      newAmount = mustIncreaseAmount ? parsedAmount * 2 : Math.floor(parsedAmount / 2);
      break;
    // For minutes, increase or decrease in doubles or halves, depending on
    // the amount of minutes
    case 'm':
      let ratio;
      const MINUTES_LARGE = 10;
      if (mustIncreaseAmount) {
        ratio = parsedAmount >= MINUTES_LARGE ? 0.5 : 1;
        newAmount = parsedAmount + Math.floor(parsedAmount * ratio);
      } else {
        newAmount =
          parsedAmount >= MINUTES_LARGE
            ? Math.floor(parsedAmount / 1.5)
            : parsedAmount - Math.floor(parsedAmount * 0.5);
      }
      break;

    // For hours, increase or decrease half an hour for 1 hour. Otherwise
    // increase full hours
    case 'h':
      if (parsedAmount === 1) {
        newAmount = mustIncreaseAmount ? 90 : 30;
        newUnit = 'm';
      } else {
        newAmount = mustIncreaseAmount ? parsedAmount + 1 : parsedAmount - 1;
      }
      break;

    // For the rest of units, increase or decrease one smaller unit for
    // amounts of 1. Otherwise increase or decrease the unit
    case 'd':
    case 'w':
    case 'M':
    case 'y':
      if (parsedAmount === 1) {
        newUnit = dateMath.unitsDesc[dateMath.unitsDesc.indexOf(unit) + 1];
        newAmount = mustIncreaseAmount
          ? convertDate(1, unit, newUnit) + 1
          : convertDate(1, unit, newUnit) - 1;
      } else {
        newAmount = mustIncreaseAmount ? parsedAmount + 1 : parsedAmount - 1;
      }
      break;

    default:
      throw new TypeError('Unhandled datemath unit');
  }

  // normalize amount and unit (i.e. 120s -> 2m)
  const { unit: normalizedUnit, amount: normalizedAmount } = normalizeDate(newAmount, newUnit);

  // How much have we changed the time?
  const diffAmount = Math.abs(normalizedAmount - convertDate(parsedAmount, unit, normalizedUnit));
  // if `diffAmount` is not an integer after normalization, express the difference in the original unit
  const shouldKeepDiffUnit = diffAmount % 1 !== 0;

  const nextValue = `now${operator}${normalizedAmount}${normalizedUnit}`;

  if (isDateInRange(nextValue)) {
    return {
      value: nextValue,
      diffUnit: shouldKeepDiffUnit ? unit : newUnit,
      diffAmount: shouldKeepDiffUnit ? Math.abs(newAmount - parsedAmount) : diffAmount,
    };
  } else {
    return undefined;
  }
}

function extendAbsoluteDatemath(
  value: string,
  direction: 'before' | 'after',
  oppositeEdge: string
): DatemathExtension | undefined {
  const valueTimestamp = datemathToEpochMillis(value)!;
  const oppositeEdgeTimestamp = datemathToEpochMillis(oppositeEdge)!;
  const actualTimestampDiff = Math.abs(valueTimestamp - oppositeEdgeTimestamp);
  const normalizedDiff = normalizeDate(actualTimestampDiff, 'ms');
  const normalizedTimestampDiff = convertDate(normalizedDiff.amount, normalizedDiff.unit, 'ms');

  const newValue =
    direction === 'before'
      ? valueTimestamp - normalizedTimestampDiff
      : valueTimestamp + normalizedTimestampDiff;

  if (isDateInRange(newValue)) {
    return {
      value: new Date(newValue).toISOString(),
      diffUnit: normalizedDiff.unit,
      diffAmount: normalizedDiff.amount,
    };
  } else {
    return undefined;
  }
}

const CONVERSION_RATIOS: Record<string, Array<[Unit, number]>> = {
  wy: [
    ['w', 52], // 1 year = 52 weeks
    ['y', 1],
  ],
  w: [
    ['ms', 1000],
    ['s', 60],
    ['m', 60],
    ['h', 24],
    ['d', 7], // 1 week = 7 days
    ['w', 4], // 1 month = 4 weeks = 28 days
    ['M', 12], // 1 year = 12 months = 52 weeks = 364 days
    ['y', 1],
  ],
  M: [
    ['ms', 1000],
    ['s', 60],
    ['m', 60],
    ['h', 24],
    ['d', 30], // 1 month = 30 days
    ['M', 12], // 1 year = 12 months = 360 days
    ['y', 1],
  ],
  default: [
    ['ms', 1000],
    ['s', 60],
    ['m', 60],
    ['h', 24],
    ['d', 365], // 1 year = 365 days
    ['y', 1],
  ],
};

function getRatioScale(from: Unit, to?: Unit) {
  if ((from === 'y' && to === 'w') || (from === 'w' && to === 'y')) {
    return CONVERSION_RATIOS.wy;
  } else if (from === 'w' || to === 'w') {
    return CONVERSION_RATIOS.w;
  } else if (from === 'M' || to === 'M') {
    return CONVERSION_RATIOS.M;
  } else {
    return CONVERSION_RATIOS.default;
  }
}

export function convertDate(value: number, from: Unit, to: Unit): number {
  if (from === to) {
    return value;
  }

  const ratioScale = getRatioScale(from, to);
  const fromIdx = ratioScale.findIndex((ratio) => ratio[0] === from);
  const toIdx = ratioScale.findIndex((ratio) => ratio[0] === to);

  let convertedValue = value;

  if (fromIdx > toIdx) {
    // `from` is the bigger unit. Multiply the value
    for (let i = toIdx; i < fromIdx; i++) {
      convertedValue *= ratioScale[i][1];
    }
  } else {
    // `from` is the smaller unit. Divide the value
    for (let i = fromIdx; i < toIdx; i++) {
      convertedValue /= ratioScale[i][1];
    }
  }

  return convertedValue;
}

export function normalizeDate(amount: number, unit: Unit): { amount: number; unit: Unit } {
  // There is nothing after years
  if (unit === 'y') {
    return { amount, unit };
  }

  const nextUnit = dateMath.unitsAsc[dateMath.unitsAsc.indexOf(unit) + 1];
  const ratioScale = getRatioScale(unit, nextUnit);
  const ratio = ratioScale.find((r) => r[0] === unit)![1];

  const newAmount = amount / ratio;

  // Exact conversion
  if (newAmount === 1) {
    return { amount: newAmount, unit: nextUnit };
  }

  // Might be able to go one unit more, so try again, rounding the value
  // 7200s => 120m => 2h
  // 7249s ~> 120m ~> 2h
  if (newAmount >= 2) {
    return normalizeDate(Math.round(newAmount), nextUnit);
  }

  // Cannot go one one unit above. Return as it is
  return { amount, unit };
}

function isDateInRange(date: string | number): boolean {
  try {
    const epoch = typeof date === 'string' ? datemathToEpochMillis(date) ?? -1 : date;
    return epoch >= 0 && epoch <= JS_MAX_DATE;
  } catch {
    return false;
  }
}
