const { Temporal } = temporal // import

export const timeObjFromCalendarObj = (yearMonthDayHour, timeZone) => {
  // This adapter is not nice to Temporal, because it would also have an `{overflow: 'constrain'}` option, but the
  // more practical alternatives moment.js and luxon.js don't support that; it'd also require filtering of results
  // for duplicates and degenerate intervals. Why is overflow happening, irrespective of the backing time library?
  // Because we generate a raster of time by eg. iterating through the months, and trying to create all days 1..31,
  // even for eg. February. Because it's best to avoid second-guessing leap days etc. Somehow it feels not as robust
  // to switch to a relative `.add()` or `.plus()`, because if there's any error, it propagates, but maybe it's safe.
  let t // aargh try/catch/finally scoping
  try {
    t = Temporal.ZonedDateTime.from({ timeZone, ...yearMonthDayHour }, { overflow: 'reject' })
  } catch {
    return null
  }
  return t
}
export const timeObjFromEpochSeconds = (timeZone, seconds) =>
  Temporal.Instant.fromEpochSeconds(Math.round(seconds)).toZonedDateTimeISO(timeZone)
export const timeObjToSeconds = t => t?.epochSeconds ?? NaN
export const timeObjToWeekday = t => t?.dayOfWeek ?? NaN
export const timeObjToYear = t => t?.year ?? NaN
export const addTimeToObj = (obj, unit, count) => obj && obj.add({ [unit]: count })