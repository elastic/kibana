/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TIME_UNITS } from '../../../common/constants';

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

  formatTime(timeUnit, timeValue) {
    const now = 'now';

    if (timeValue === 0) {
      return now;
    }

    // milliseconds is the default in Date Math
    if (timeUnit === TIME_UNITS.MILLISECOND) {
      return timeValue;
    }

    return `${now}+${timeValue}${timeUnit}`;
  }

  get upstreamJson() {
    const triggeredTime = this.triggeredTimeValue ? this.formatTime(this.triggeredTimeUnit, this.triggeredTimeValue) : undefined;
    const scheduledTime = this.scheduledTimeValue ?  this.formatTime(this.scheduledTimeUnit, this.scheduledTimeValue) : undefined;

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
