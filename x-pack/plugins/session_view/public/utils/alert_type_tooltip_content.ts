/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import { ALERT } from '../../common/constants';

export const getAlertTypeTooltipContent = (processEventAlertCategory: string): string => {
  const alertSuffix = processEventAlertCategory !== ALERT ? ALERT : '';
  return `${capitalize(processEventAlertCategory)} ${alertSuffix}`;
};
