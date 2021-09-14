/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult, Logger } from '../../../../../../../../src/core/server';
import { SideCarAction } from './types';

export interface GetThrottleOptions {
  actionSideCar: SavedObjectsFindResult<SideCarAction>;
  logger: Logger;
}

export const getThrottle = ({ actionSideCar, logger }: GetThrottleOptions): string => {
  if (actionSideCar.attributes.alertThrottle != null) {
    return actionSideCar.attributes.alertThrottle;
  } else if (actionSideCar.attributes.ruleThrottle != null) {
    return actionSideCar.attributes.ruleThrottle;
  } else {
    logger.error(
      'Error finding a legacy "alertThrottle" or "ruleThrottle" to determine interval to migrate the actions to. Using a fall back of "1h" interval"'
    );
    return '1h';
  }
};
