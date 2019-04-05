/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIME_UNITS } from '../../../common/constants';
import moment from 'moment';

export class ExecuteDetails {
  constructor(props = {}) {
    this.triggeredTimeValue = props.triggeredTimeValue;
    this.triggeredTimeUnit = props.triggeredTimeUnit;
    this.scheduledTimeValue = props.scheduledTimeValue;
    this.scheduledTimeUnit = props.scheduledTimeUnit;
    this.scheduledTime = props.scheduledTime;
    this.ignoreCondition = props.ignoreCondition;
    this.alternativeInput = props.alternativeInput;
    this.actionModes = props.actionModes;
    this.recordExecution = props.recordExecution;
  }

  formatTime(timeUnit, value) {
    let timeValue = moment();
    switch (timeUnit) {
      case TIME_UNITS.SECOND:
        timeValue = timeValue.add(value, 'seconds');
        break;
      case TIME_UNITS.MINUTE:
        timeValue = timeValue.add(value, 'minutes');
        break;
      case TIME_UNITS.HOUR:
        timeValue = timeValue.add(value, 'hours');
        break;
      case TIME_UNITS.MILLISECOND:
        timeValue = timeValue.add(value, 'milliseconds');
        break;
    }
    return timeValue.format();
  }

  get upstreamJson() {
    const hasTriggerTime = this.triggeredTimeValue !== '';
    const hasScheduleTime = this.scheduledTimeValue !== '';
    const triggeredTime = hasTriggerTime ? this.formatTime(this.triggeredTimeUnit, this.triggeredTimeValue) : undefined;
    const scheduledTime = hasScheduleTime ?  this.formatTime(this.scheduledTimeUnit, this.scheduledTimeValue) : undefined;
    return {
      triggerData: {
        triggeredTime,
        scheduledTime,
      },
      ignoreCondition: this.ignoreCondition,
      alternativeInput: this.alternativeInput,
      actionModes: this.actionModes,
      recordExecution: this.recordExecution,
    };
  }
}
