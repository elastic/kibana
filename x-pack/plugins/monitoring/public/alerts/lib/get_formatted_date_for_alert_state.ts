/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment-timezone';
import { CommonAlertState } from '../../../common/types/alerts';
import { Legacy } from '../../legacy_shims';

export function getFormattedDateForAlertState(state: CommonAlertState) {
  const timestamp = state.state.ui.triggeredMS;
  const tz = Legacy.shims.uiSettings.get('dateFormat:tz');
  return moment(timestamp)
    .tz(tz === 'Browser' ? moment.tz.guess() : tz)
    .calendar();
}
