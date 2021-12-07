/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { epochInSecondsToYear } from './chrono/chrono.js';
import { cachedTimeDelta, cachedZonedDateTimeFrom, timeProp } from './chrono/cachedChrono.js';

// utils
const firstOccurrence = (d, i, a) => a.indexOf(d) === i;

const approxWidthsInSeconds = {
  year: 365.25 * 24 * 60 * 60,
  month: (365.25 * 24 * 60 * 60) / 12,
  week: 7 * 24 * 60 * 60,
  day: 24 * 60 * 60,
  hour: 60 * 60,
  minute: 60,
  second: 1,
  millisecond: 0.001,
};

export const rasters = (
  {
    minimumTickPixelDistance,
    locale,
    defaultFontColor,
    weekendFontColor,
    offHourFontColor,
    workHourMin,
    workHourMax,
  },
  timeZone
) => {
  const years = {
    unit: 'year',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance,
    binStarts: function* (domainFrom, domainTo) {
      const fromYear = epochInSecondsToYear(timeZone, domainFrom);
      const toYear = epochInSecondsToYear(timeZone, domainTo);
      for (let year = fromYear; year <= toYear; year++) {
        const timePoint = cachedZonedDateTimeFrom({ timeZone, year, month: 1, day: 1 });
        const timePointSec = timePoint[timeProp.epochSeconds];
        const nextTimePointSec = cachedZonedDateTimeFrom({
          timeZone,
          year: year + 1,
          month: 1,
          day: 1,
        })[timeProp.epochSeconds];
        yield { year, timePointSec, nextTimePointSec };
      }
    },
    detailedLabelFormat: new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone }).format,
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone }).format,
  };
  const months = {
    unit: 'month',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance * 3.6, // wow some Greek names are long
    binStarts: function* (domainFrom, domainTo) {
      for (const { year } of years.binStarts(domainFrom, domainTo)) {
        for (let month = 1; month <= 12; month++) {
          const timePoint = cachedZonedDateTimeFrom({ timeZone, year, month, day: 1 });
          const timePointSec = timePoint[timeProp.epochSeconds];
          const nextTimePointSec = cachedZonedDateTimeFrom({
            timeZone,
            year: month < 12 ? year : year + 1,
            month: ((month + 1 - 1) % 12) + 1, // next month (+1) but needs to be 0 = January for the modulus (-1)
            day: 1,
          })[timeProp.epochSeconds];
          yield { year, month, timePointSec, nextTimePointSec };
        }
      }
    },
    detailedLabelFormat: new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      timeZone,
    }).format,
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, { month: 'long', timeZone }).format,
  };
  const shortMonths = {
    ...months,
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, { month: 'short', timeZone }).format,
    minimumTickPixelDistance: minimumTickPixelDistance * 2,
  };
  const narrowMonths = {
    ...months,
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, { month: 'narrow', timeZone }).format,
    minimumTickPixelDistance: minimumTickPixelDistance,
  };
  const days = {
    unit: 'day',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance,
    binStarts: function* (domainFrom, domainTo) {
      for (const { year, month } of months.binStarts(domainFrom, domainTo)) {
        for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth++) {
          const temporalArgs = {
            timeZone,
            year,
            month,
            day: dayOfMonth,
          };
          const timePoint = cachedZonedDateTimeFrom(temporalArgs);
          const dayOfWeek = timePoint[timeProp.dayOfWeek];
          const timePointSec = timePoint[timeProp.epochSeconds];
          const nextTimePointSec = cachedTimeDelta(temporalArgs, 'days', 1);
          if (Number.isFinite(timePointSec) && Number.isFinite(nextTimePointSec))
            yield {
              year,
              month,
              dayOfMonth,
              dayOfWeek,
              fontColor: weekendFontColor && dayOfWeek > 5 ? weekendFontColor : undefined,
              timePointSec,
              nextTimePointSec,
            };
        }
      }
    },
    detailedLabelFormat: new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone,
    }).format,
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      timeZone,
    }).format,
  };
  const weekStartDays = {
    unit: 'week',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance,
    binStarts: function* (domainFrom, domainTo) {
      for (const { year, month } of months.binStarts(domainFrom, domainTo)) {
        for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth++) {
          const temporalArgs = { timeZone, year, month, day: dayOfMonth };
          const timePoint = cachedZonedDateTimeFrom(temporalArgs);
          const dayOfWeek = timePoint[timeProp.dayOfWeek];
          if (dayOfWeek !== 1) continue;
          const timePointSec = timePoint[timeProp.epochSeconds];
          if (Number.isFinite(timePointSec)) {
            yield {
              dayOfMonth,
              timePointSec,
              nextTimePointSec: cachedTimeDelta(temporalArgs, 'days', 7),
            };
          }
        }
      }
    },
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      timeZone,
    }).format,
  };
  const daysUnlabelled = {
    ...days,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const weeksUnlabelled = {
    ...weekStartDays,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const monthsUnlabelled = {
    ...months,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const millisecondBinStarts = (rasterMs) =>
    function* (domainFrom, domainTo) {
      for (
        let t = Math.floor((domainFrom * 1000) / rasterMs);
        t < Math.ceil((domainTo * 1000) / rasterMs);
        t++
      ) {
        const timePointSec = (t * rasterMs) / 1000;
        yield {
          timePointSec,
          nextTimePointSec: timePointSec + rasterMs / 1000,
        };
      }
    };
  const hours = {
    unit: 'hour',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: 2 * minimumTickPixelDistance,
    binStarts: millisecondBinStarts(60 * 60 * 1000),
    detailedLabelFormat: new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      timeZone,
    }).format,
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      timeZone,
    }).format,
  };
  const hoursUnlabelled = {
    ...hours,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const sixHours = {
    unit: 'hour',
    unitMultiplier: 6,
    labeled: true,
    minimumTickPixelDistance: 2 * minimumTickPixelDistance,
    binStarts: (domainFrom, domainTo) =>
      [...days.binStarts(domainFrom, domainTo)]
        .flatMap(({ year, month, dayOfMonth, dayOfWeek }) =>
          [0, 6, 12, 18].map((hour) => {
            const temporalArgs = {
              timeZone,
              year,
              month,
              day: dayOfMonth,
              hour,
            };
            const timePoint = cachedZonedDateTimeFrom(temporalArgs);
            const timePointSec = timePoint[timeProp.epochSeconds];
            return Number.isNaN(timePointSec)
              ? []
              : {
                  dayOfMonth,
                  fontColor:
                    offHourFontColor && (hour < workHourMin || hour > workHourMax)
                      ? offHourFontColor
                      : defaultFontColor,
                  dayOfWeek,
                  hour,
                  year,
                  month,
                  timePointSec,
                  nextTimePointSec: timePointSec + 6 * 60 * 60, // fixme this is not correct in case the day is 23hrs long due to winter->summer time switch
                };
          })
        )
        .map((b, i, a) =>
          Object.assign(b, {
            nextTimePointSec: i === a.length - 1 ? b.nextTimePointSec : a[i + 1].timePointSec,
          })
        ),
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      timeZone,
    }).format,
  };
  const sixHoursUnlabelled = {
    ...sixHours,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const minutes = {
    unit: 'minute',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance,
    binStarts: millisecondBinStarts(60 * 1000),
    detailedLabelFormat: new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZone,
    }).format,
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, {
      minute: 'numeric',
      timeZone,
    }).format,
  };
  const quarterHours = {
    ...minutes,
    unitMultiplier: 15,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance,
    binStarts: millisecondBinStarts(15 * 60 * 1000),
  };
  const quarterHoursUnlabelled = {
    ...quarterHours,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const fiveMinutes = {
    ...minutes,
    unitMultiplier: 5,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance,
    binStarts: millisecondBinStarts(5 * 60 * 1000),
  };
  const fiveMinutesUnlabelled = {
    ...fiveMinutes,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const minutesUnlabelled = {
    ...minutes,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const seconds = {
    unit: 'second',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance,
    binStarts: millisecondBinStarts(1000),
    detailedLabelFormat: new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZone,
    }).format,
    minorTickLabelFormat: new Intl.DateTimeFormat(locale, {
      second: 'numeric',
      timeZone,
    }).format,
  };
  const quarterMinutes = {
    ...seconds,
    unitMultiplier: 15,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance,
    binStarts: millisecondBinStarts(15 * 1000),
  };
  const quarterMinutesUnlabelled = {
    ...quarterMinutes,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const fiveSeconds = {
    ...seconds,
    unitMultiplier: 5,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance,
    binStarts: millisecondBinStarts(5 * 1000),
  };
  const fiveSecondsUnlabelled = {
    ...fiveSeconds,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const secondsUnlabelled = {
    ...seconds,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const milliseconds = {
    unit: 'millisecond',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance * 1.2,
    binStarts: millisecondBinStarts(1),
    minorTickLabelFormat: (d) => String(d % 1000),
  };
  const tenMilliseconds = {
    ...milliseconds,
    unitMultiplier: 10,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance * 1.2,
    binStarts: millisecondBinStarts(10),
  };
  const hundredMilliseconds = {
    ...milliseconds,
    unitMultiplier: 100,
    labeled: true,
    minimumTickPixelDistance: minimumTickPixelDistance * 1.2,
    binStarts: millisecondBinStarts(100),
  };
  const millisecondsUnlabelled = {
    ...milliseconds,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const tenMillisecondsUnlabelled = {
    ...tenMilliseconds,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };
  const hundredMillisecondsUnlabelled = {
    ...hundredMilliseconds,
    labeled: false,
    minimumTickPixelDistance: minimumTickPixelDistance / 2,
  };

  const rasters = [
    years,
    monthsUnlabelled,
    narrowMonths,
    shortMonths,
    months,
    weekStartDays,
    daysUnlabelled,
    days,
    sixHoursUnlabelled,
    sixHours,
    hoursUnlabelled,
    hours,
    quarterHoursUnlabelled,
    quarterHours,
    fiveMinutesUnlabelled,
    fiveMinutes,
    minutesUnlabelled,
    minutes,
    quarterMinutesUnlabelled,
    quarterMinutes,
    fiveSecondsUnlabelled,
    fiveSeconds,
    secondsUnlabelled,
    seconds,
    hundredMillisecondsUnlabelled,
    hundredMilliseconds,
    tenMillisecondsUnlabelled,
    tenMilliseconds,
    millisecondsUnlabelled,
    milliseconds,
  ]
    // enrich with derived data; Object.assign preserves object identity
    .map((r) =>
      Object.assign(r, {
        minimumPixelsPerSecond:
          r.minimumTickPixelDistance / (approxWidthsInSeconds[r.unit] * r.unitMultiplier),
      })
    );

  /**
   * Replacement rules
   *
   * Often, if a specific raster is present, then some other rasters need to be removed and/or replaced with something.
   * Removal is modeled with the empty array: later flatMapping an empty array will just lead to no inclusion.
   * For each raster present and fitting (pixel width wise), there's a key-value pair.
   *
   * Example: when fiveMinutes is present in the fitting set (`layers` array`),
   *   - remove fiveMinutesUnlabelled (done with it mapping to the empty array) as it'd lead to overdraw
   *   - replace quarterHours with quarterHoursUnlabelled (so 0, 15, 30, 45 aren't over-fillText-ed on one another)
   *
   * As the replacement uses flatMap logic, it'd be possible to add rasters or replace one raster with multiple rasters
   * but these powers aren't currently used.
   *
   * While some of these rules could be coded in logic, rather than in this rules table, this is a pretty flexible
   * approach that can do a variety of things, eg. we could render tick labels for every 2nd hours if only that fits,
   * though aiming at maximal utilization for labeling would result in more jumps (eg. jumping from every 5th value
   * to every 2nd value would _remove_ 5, 15, 25 etc so it'd look less stable on zoom, while OK in static view; even
   * in static cases, consistency of the 1-5-15 cadence has stability benefits, and still allows great readability)
   *
   * Due to the simple structure of this table, it's easy to make a configuration UI even for custom periodicity a
   * user might need.
   *
   * Further power could be added if the match wasn't on a single element (eg. "if fiveMinutes is
   * in the fitting set") but the presence of multiple rasters would be checked (eg. presence of week and day would
   * remove months). But such power didn't seem necessary so far.
   */
  const replacements = [
    [years, new Map([])],
    [narrowMonths, new Map([[monthsUnlabelled, []]])],
    [
      shortMonths,
      new Map([
        [monthsUnlabelled, []],
        [narrowMonths, []],
      ]),
    ],
    [
      months,
      new Map([
        [monthsUnlabelled, []],
        [narrowMonths, []],
        [shortMonths, []],
      ]),
    ],
    [
      days,
      new Map([
        [daysUnlabelled, []],
        [weekStartDays, weeksUnlabelled],
      ]),
    ],
    [sixHours, new Map([[sixHoursUnlabelled, []]])],
    [
      hours,
      new Map([
        [hoursUnlabelled, []],
        [sixHours, []],
      ]),
    ],
    [quarterHours, new Map([[quarterHoursUnlabelled, []]])],
    [
      fiveMinutes,
      new Map([
        [fiveMinutesUnlabelled, []],
        [quarterHours, quarterHoursUnlabelled],
      ]),
    ],
    [
      minutes,
      new Map([
        [minutesUnlabelled, []],
        [quarterHours, quarterHoursUnlabelled],
        [fiveMinutes, fiveMinutesUnlabelled],
      ]),
    ],
    [
      quarterMinutes,
      new Map([
        [quarterMinutesUnlabelled, []],
        [quarterMinutes, quarterMinutesUnlabelled],
      ]),
    ],
    [
      fiveSeconds,
      new Map([
        [fiveSecondsUnlabelled, []],
        [quarterMinutes, quarterMinutesUnlabelled],
      ]),
    ],
    [
      seconds,
      new Map([
        [secondsUnlabelled, []],
        [quarterMinutes, quarterMinutesUnlabelled],
        [fiveSeconds, fiveSecondsUnlabelled],
      ]),
    ],
    [hundredMilliseconds, new Map([[hundredMillisecondsUnlabelled, []]])],
    [
      tenMilliseconds,
      new Map([
        [tenMillisecondsUnlabelled, []],
        [hundredMilliseconds, hundredMillisecondsUnlabelled],
      ]),
    ],
    [
      milliseconds,
      new Map([
        [millisecondsUnlabelled, []],
        [tenMilliseconds, tenMillisecondsUnlabelled],
        [hundredMilliseconds, hundredMillisecondsUnlabelled],
      ]),
    ],
  ];

  return (filter) => {
    // keep increasingly finer granularities, but only until there's enough pixel width for them to fit
    let layers = [];
    for (const layer of rasters) {
      if (filter(layer)) layers.unshift(layer);
      else break; // `rasters` is ordered, so we exit the loop here, it's already too dense, remaining ones are ignored
    }

    // this is not super efficient O(n)-wise; replacement rules have very few, short entries, can switch to Maps later
    replacements.forEach(([key, ruleMap]) => {
      if (layers.includes(key)) {
        layers = layers.flatMap((l) => ruleMap.get(l) || l);
      }
    });

    // while it's not currently eliminating rasters, there can be replacements rules in theory that lead to duplication
    return layers.filter(firstOccurrence);
  };
};
