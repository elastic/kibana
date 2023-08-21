/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { Unit } from '@kbn/datemath';

export const getTimeTypeValue = (time: string): { unit: Unit; value: number } => {
  const timeObj: { unit: Unit; value: number } = {
    unit: 'ms',
    value: 0,
  };
  const filterTimeVal = time.match(/\d+/g);
  const filterTimeType = time.match(/[a-zA-Z]+/g);
  if (!isEmpty(filterTimeVal) && filterTimeVal != null && !isNaN(Number(filterTimeVal[0]))) {
    timeObj.value = Number(filterTimeVal[0]);
  }
  if (
    !isEmpty(filterTimeType) &&
    filterTimeType != null &&
    ['s', 'm', 'h', 'd'].includes(filterTimeType[0])
  ) {
    timeObj.unit = filterTimeType[0] as Unit;
  }
  return timeObj;
};
