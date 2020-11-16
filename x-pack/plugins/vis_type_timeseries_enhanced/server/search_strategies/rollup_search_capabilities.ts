/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get, has } from 'lodash';
import { leastCommonInterval, isCalendarInterval } from './lib/interval_helper';

import {
  ReqFacade,
  DefaultSearchCapabilities,
  VisPayload,
} from '../../../../../src/plugins/vis_type_timeseries/server';

export class RollupSearchCapabilities extends DefaultSearchCapabilities {
  rollupIndex: string;
  availableMetrics: Record<string, any>;

  constructor(
    req: ReqFacade<VisPayload>,
    fieldsCapabilities: Record<string, any>,
    rollupIndex: string
  ) {
    super(req, fieldsCapabilities);

    this.rollupIndex = rollupIndex;
    this.availableMetrics = get(fieldsCapabilities, `${rollupIndex}.aggs`, {});
  }

  public get dateHistogram() {
    const [dateHistogram] = Object.values<any>(this.availableMetrics.date_histogram);

    return dateHistogram;
  }

  public get defaultTimeInterval() {
    return (
      this.dateHistogram.fixed_interval ||
      this.dateHistogram.calendar_interval ||
      /*
         Deprecation: [interval] on [date_histogram] is deprecated, use [fixed_interval] or [calendar_interval] in the future.
         We can remove the following line only for versions > 8.x
        */
      this.dateHistogram.interval ||
      null
    );
  }

  public get searchTimezone() {
    return get(this.dateHistogram, 'time_zone', null);
  }

  public get whiteListedMetrics() {
    const baseRestrictions = this.createUiRestriction({
      count: this.createUiRestriction(),
    });

    const getFields = (fields: { [key: string]: any }) =>
      Object.keys(fields).reduce(
        (acc, item) => ({
          ...acc,
          [item]: true,
        }),
        this.createUiRestriction({})
      );

    return Object.keys(this.availableMetrics).reduce(
      (acc, item) => ({
        ...acc,
        [item]: getFields(this.availableMetrics[item]),
      }),
      baseRestrictions
    );
  }

  public get whiteListedGroupByFields() {
    return this.createUiRestriction({
      everything: true,
      terms: has(this.availableMetrics, 'terms'),
    });
  }

  public get whiteListedTimerangeModes() {
    return this.createUiRestriction({
      last_value: true,
    });
  }

  getValidTimeInterval(userIntervalString: string) {
    const parsedRollupJobInterval = this.parseInterval(this.defaultTimeInterval);
    const inRollupJobUnit = this.convertIntervalToUnit(
      userIntervalString,
      parsedRollupJobInterval!.unit
    );

    const getValidCalendarInterval = () => {
      let unit = parsedRollupJobInterval!.unit;

      if (inRollupJobUnit!.value > parsedRollupJobInterval!.value) {
        const inSeconds = this.convertIntervalToUnit(userIntervalString, 's');
        if (inSeconds?.value) {
          unit = this.getSuitableUnit(inSeconds.value);
        }
      }

      return {
        value: 1,
        unit,
      };
    };

    const getValidFixedInterval = () => ({
      value: leastCommonInterval(inRollupJobUnit?.value, parsedRollupJobInterval?.value),
      unit: parsedRollupJobInterval!.unit,
    });

    const { value, unit } = (isCalendarInterval(parsedRollupJobInterval!)
      ? getValidCalendarInterval
      : getValidFixedInterval)();

    return `${value}${unit}`;
  }
}
