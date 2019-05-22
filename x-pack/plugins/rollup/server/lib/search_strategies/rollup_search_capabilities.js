/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { get, has } from 'lodash';
import { unitsMap } from '@elastic/datemath';

const leastCommonInterval = (num = 0, base = 0) => Math.max(Math.ceil(num / base) * base, base);
const isCalendarInterval = ({ unit, value }) => value === 1 && ['calendar', 'mixed'].includes(unitsMap[unit].type);

export const getRollupSearchCapabilities = (DefaultSearchCapabilities) =>
  (class RollupSearchCapabilities extends DefaultSearchCapabilities {
    constructor(req, batchRequestsSupport, fieldsCapabilities, rollupIndex) {
      super(req, batchRequestsSupport, fieldsCapabilities);

      this.rollupIndex = rollupIndex;
      this.availableMetrics = get(fieldsCapabilities, `${rollupIndex}.aggs`, {});
    }

    get dateHistogram() {
      const [dateHistogram] = Object.values(this.availableMetrics.date_histogram);

      return dateHistogram;
    }

    get defaultTimeInterval() {
      return get(this.dateHistogram, 'interval', null);
    }

    get searchTimezone() {
      return get(this.dateHistogram, 'time_zone', null);
    }

    get whiteListedMetrics() {
      const baseRestrictions = this.createUiRestriction({
        count: this.createUiRestriction(),
      });

      const getFields = fields => Object.keys(fields)
        .reduce((acc, item) => ({
          ...acc,
          [item]: true,
        }), this.createUiRestriction({}));

      return Object.keys(this.availableMetrics).reduce((acc, item) => ({
        ...acc,
        [item]: getFields(this.availableMetrics[item]),
      }), baseRestrictions);
    }

    get whiteListedGroupByFields() {
      return this.createUiRestriction({
        everything: true,
        terms: has(this.availableMetrics, 'terms'),
      });
    }

    getValidTimeInterval(userIntervalString) {
      const parsedRollupJobInterval = this.parseInterval(this.defaultTimeInterval);
      const parsedUserInterval = this.parseInterval(userIntervalString);

      let { unit } = parsedRollupJobInterval;
      let { value } = this.convertIntervalToUnit(userIntervalString, unit);

      if (isCalendarInterval(parsedRollupJobInterval) && isCalendarInterval(parsedUserInterval)) {
        unit = value > 1 ? parsedUserInterval.unit : parsedRollupJobInterval.unit;
        value = 1;
      } else {
        value = leastCommonInterval(value, parsedRollupJobInterval.value);
      }

      return `${value}${unit}`;
    }
  });
