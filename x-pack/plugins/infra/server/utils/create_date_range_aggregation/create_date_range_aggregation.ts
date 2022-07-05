/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';

interface StringTimerange {
  from: string;
  to: string;
}

interface NumberTimerange {
  from: number;
  to: number;
}

type Timerange = StringTimerange | NumberTimerange;

// Should we always drop partial ranges?
type PartialRangeSetting = 'start' | 'end' | 'drop';
type RangeSizeMode = 'minimum' | 'exact';

interface Options {
  timerange: Timerange;
  targetRangeSize: string;
  field?: string;
  partialRangeSetting?: PartialRangeSetting;
  targetGranularity?: number;
}

const defaults: Required<Omit<Options, 'timerange' | 'targetRangeSize'>> = {
  field: '@timestamp',
  partialRangeSetting: 'start',
  targetGranularity: 100,
};

interface RangeSizeOptions {
  mode: RangeSizeMode;
  rangeSizeMs: number;
  durationMs: number;
  targetGranularity: number;
}

const unitToMilliseconds: Record<string, number> = {
  s: 1000,
  m: 60000,
  h: 60000 * 60,
  d: 60000 * 60 * 24,
  w: 60000 * 60 * 24 * 7,
  M: 60000 * 60 * 24 * 30,
  y: 60000 * 60 * 24 * 365,
};

// The timerange follows ES semantics of being inclusive from and exclusive to
export function createDateRangeAggregation(optionsWithoutDefaults: Options) {
  const options = Object.assign({}, optionsWithoutDefaults, defaults);
  const { to, from } = normalizeTimerange(options.timerange);
  const durationMs = to - from;

  const rangeSettings = parseTargetRangeSize(options.targetRangeSize);
  const rangeSizeMs = calculateRangeSize({
    ...rangeSettings,
    durationMs,
    targetGranularity: options.targetGranularity,
  });

  if (durationMs < rangeSizeMs) {
    // Is this always a problem, can I use the duration as a single sized bucket instead?
    throw new Error('Duration is shorter than range size');
  }

  return generateDateRangeAggregation(
    options.field,
    { to, from },
    durationMs,
    rangeSizeMs,
    options.partialRangeSetting
  );
}

function normalizeTimerange(timerange: Timerange): NumberTimerange {
  // How to account for timezones?
  const { from, to } = timerange;

  if (typeof from === 'string' && typeof to === 'string') {
    if (from.includes('now') || from.includes('||') || to.includes('now') || to.includes('||')) {
      const now = new Date();
      const fromMoment = datemath.parse(from, { forceNow: now });
      const toMoment = datemath.parse(to, { forceNow: now });

      if (!fromMoment || !toMoment) {
        throw new Error('Invalid datemath format');
      }

      return {
        from: fromMoment.valueOf(),
        to: toMoment.valueOf(),
      };
    }

    const fromDate = new Date(from).getTime();
    const toDate = new Date(to).getTime();

    if (!isNaN(fromDate) && !isNaN(toDate)) {
      return {
        from: fromDate,
        to: toDate,
      };
    }

    throw new Error('Invalid date string format');
  } else if (typeof from === 'number' && typeof to === 'number') {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new Error('Invalid millisecond date range');
    }

    return timerange as NumberTimerange;
  }

  throw new Error('Unsupported timerange format');
}

function parseTargetRangeSize(targetRangeSize: string) {
  if (targetRangeSize.startsWith('>=')) {
    return {
      rangeSizeMs: parseUnitString(targetRangeSize.substring(2)),
      mode: 'minimum' as RangeSizeMode,
    };
  }

  return {
    rangeSizeMs: parseUnitString(targetRangeSize),
    mode: 'exact' as RangeSizeMode,
  };
}

function parseUnitString(valueUnitString: string) {
  const valueUnitPattern = new RegExp(`^([\\d\\.]+)(${datemath.units.join('|')})$`);
  const matches = valueUnitString.match(valueUnitPattern);

  if (!matches) {
    throw new Error(`Unsupported value unit format: ${valueUnitString}`);
  }

  const [_, value, unit] = matches;

  if (unit === 'ms') {
    return parseFloat(value);
  } else {
    return parseFloat(value) * unitToMilliseconds[unit];
  }
}

function calculateRangeSize({
  mode,
  rangeSizeMs,
  durationMs,
  targetGranularity,
}: RangeSizeOptions) {
  if (mode === 'exact') {
    return rangeSizeMs;
  }

  if (mode === 'minimum') {
    const calculatedRangeSizeMs = Math.floor(durationMs / targetGranularity);

    if (calculatedRangeSizeMs < rangeSizeMs) {
      return rangeSizeMs;
    }

    return calculatedRangeSizeMs;
  }

  throw new Error(`Unexpected range size mode: ${mode}`);
}

function generateDateRangeAggregation(
  field: string,
  timerange: NumberTimerange,
  durationMs: number,
  rangeSizeMs: number,
  partialRangeSetting: PartialRangeSetting
) {
  const wholeRangeCount = Math.floor(durationMs / rangeSizeMs);
  const partialRangeSizeMs = durationMs - wholeRangeCount * rangeSizeMs;

  const ranges = generateRanges(
    timerange,
    wholeRangeCount,
    rangeSizeMs,
    partialRangeSizeMs !== 0 ? partialRangeSetting : 'drop',
    partialRangeSizeMs
  );

  return {
    date_range: {
      field,
      ranges: ranges.map(toDateStringRange),
    },
  };
}

function generateRanges(
  timerange: NumberTimerange,
  wholeRangeCount: number,
  rangeSizeMs: number,
  partialRangeSetting: PartialRangeSetting,
  partialRangeSizeMs: number
) {
  switch (partialRangeSetting) {
    case 'start':
      const startPartialRange = {
        from: timerange.from,
        to: timerange.from + partialRangeSizeMs,
      };

      return [
        startPartialRange,
        ...generateWholeRanges(startPartialRange.to, wholeRangeCount, rangeSizeMs),
      ];
    case 'end':
      const endPartialRange = {
        from: timerange.to - partialRangeSizeMs,
        to: timerange.to,
      };

      return [
        ...generateWholeRanges(timerange.from, wholeRangeCount, rangeSizeMs),
        endPartialRange,
      ];
    case 'drop':
      return generateWholeRanges(timerange.from, wholeRangeCount, rangeSizeMs);
  }
}

function generateWholeRanges(startPointMs: number, rangeCount: number, rangeSizeMs: number) {
  return Array.from(Array(rangeCount), (_, rangeIndex) => ({
    from: startPointMs + rangeIndex * rangeSizeMs,
    to: startPointMs + (rangeIndex + 1) * rangeSizeMs,
  }));
}

// Doing this makes it easier to debug/test but makes the request size larger
function toDateStringRange(range: NumberTimerange) {
  return {
    from: new Date(range.from).toISOString(),
    to: new Date(range.to).toISOString(),
  };
}
