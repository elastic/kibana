/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIME_UNITS } from '../../../common/constants';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

export class ExecuteDetails {
  constructor(props = {}) {
    this.triggeredTimeValue = props.triggeredTimeValue;
    this.triggeredTimeUnit = props.triggeredTimeUnit;
    this.scheduledTimeValue = props.scheduledTimeValue;
    this.scheduledTimeUnit = props.scheduledTimeUnit;
    this.ignoreCondition = props.ignoreCondition;
    this.alternativeInput = props.alternativeInput || '';
    this.actionModes = props.actionModes;
    this.recordExecution = props.recordExecution;
  }

  validate() {
    const errors = {
      json: [],
    };
    if (this.alternativeInput || this.alternativeInput !== '') {
      try {
        const parsedJson = JSON.parse(this.alternativeInput);
        if (parsedJson && typeof parsedJson !== 'object') {
          errors.json.push(i18n.translate(
            'xpack.watcher.sections.watchEdit.simulate.form.alternativeInputFieldError',
            {
              defaultMessage: 'Invalid JSON',
            }
          ));
        }
      } catch (e) {
        errors.json.push(i18n.translate(
          'xpack.watcher.sections.watchEdit.simulate.form.alternativeInputFieldError',
          {
            defaultMessage: 'Invalid JSON',
          }
        ));
      }
    }
    return errors;
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
      alternativeInput: this.alternativeInput !== '' ? JSON.parse(this.alternativeInput) : undefined,
      actionModes: this.actionModes,
      recordExecution: this.recordExecution,
    };
  }
}
