/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RulesConfiguration {
  flapping: {
    enabled: boolean;
    lookBackWindow: number;
    statusChangeThreshold: number;
  };
}

export const MIN_LOOK_BACK_WINDOW = 2;
export const MAX_LOOK_BACK_WINDOW = 20;
export const MIN_STATUS_CHANGE_THRESHOLD = 3;
export const MAX_STATUS_CHANGE_THRESHOLD = 20;
