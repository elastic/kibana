/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '../../../common';
import { OverallSwimlaneData, SwimlaneData } from './explorer_utils';

export const isSwimlaneData = (arg: any): arg is SwimlaneData => {
  return isPopulatedObject(arg, ['interval', 'points', 'laneLabels']);
};

export const isOverallSwimlaneData = (arg: any): arg is OverallSwimlaneData => {
  return isSwimlaneData(arg) && isPopulatedObject(arg, ['earliest', 'latest']);
};
