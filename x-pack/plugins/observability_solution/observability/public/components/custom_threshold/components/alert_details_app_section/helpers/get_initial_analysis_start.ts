/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';

export interface GetInitialAnalysisStartArgs {
  alertStart: Moment;
  intervalFactor: number;
  alertEnd?: Moment;
}

export const getDeviationMax = ({
  alertStart,
  intervalFactor,
  alertEnd,
}: GetInitialAnalysisStartArgs) => {
  if (alertEnd) {
    return alertEnd
      .clone()
      .subtract(1 * intervalFactor, 'minutes')
      .valueOf();
  } else if (
    alertStart
      .clone()
      .add(10 * intervalFactor, 'minutes')
      .isAfter(moment(new Date()))
  ) {
    return moment(new Date()).valueOf();
  } else {
    return alertStart
      .clone()
      .add(10 * intervalFactor, 'minutes')
      .valueOf();
  }
};

export const getInitialAnalysisStart = (args: GetInitialAnalysisStartArgs) => {
  const { alertStart, intervalFactor } = args;
  return {
    baselineMin: alertStart
      .clone()
      .subtract(13 * intervalFactor, 'minutes')
      .valueOf(),
    baselineMax: alertStart
      .clone()
      .subtract(2 * intervalFactor, 'minutes')
      .valueOf(),
    deviationMin: alertStart
      .clone()
      .subtract(1 * intervalFactor, 'minutes')
      .valueOf(),
    deviationMax: getDeviationMax(args),
  };
};
