/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CommonAlertState } from '../../../common/types/alerts';

export function sortByNewestAlert(a: CommonAlertState, b: CommonAlertState) {
  if (a.state.ui.triggeredMS === b.state.ui.triggeredMS) {
    return 0;
  }
  return a.state.ui.triggeredMS < b.state.ui.triggeredMS ? 1 : -1;
}
