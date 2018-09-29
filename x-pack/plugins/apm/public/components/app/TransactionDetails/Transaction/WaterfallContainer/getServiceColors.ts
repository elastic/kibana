/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { zipObject } from 'lodash';
import { colors } from '../../../../../style/variables';

interface IServiceColors {
  [key: string]: string;
}

export function getServiceColors(services: string[]): IServiceColors {
  const assignedColors = [
    colors.apmBlue,
    colors.apmGreen,
    colors.apmPurple,
    colors.apmRed2,
    colors.apmTan,
    colors.apmOrange,
    colors.apmYellow
  ];

  return zipObject(services, assignedColors);
}
