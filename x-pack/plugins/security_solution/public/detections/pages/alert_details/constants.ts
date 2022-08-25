/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_PATH } from '../../../../common/constants';

// Add '/alert' subpath to prevent future conflicts if :detailName matches a future route
export const ALERT_DETAILS_NO_TAB_PATH = `${ALERTS_PATH}/alert/:detailName`;
export const ALERT_DETAILS_PATH = `${ALERTS_PATH}/alert/:detailName/:tabName`;
export const ALERT_DETAILS_SUMMARY_PATH = `${ALERTS_PATH}/alert/:detailName/summary`;
