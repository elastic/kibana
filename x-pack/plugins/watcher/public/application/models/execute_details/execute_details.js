/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getDateMathFormat } from '../../lib/format_date';

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

    const invalidJsonFieldError = i18n.translate(
      'xpack.watcher.sections.watchEdit.simulate.form.invalidJsonFieldError',
      {
        defaultMessage: 'Invalid JSON',
      }
    );

    if (this.alternativeInput !== '') {
      try {
        const parsedJson = JSON.parse(this.alternativeInput);

        if (parsedJson && typeof parsedJson !== 'object') {
          errors.json.push(invalidJsonFieldError);
        }
      } catch (e) {
        errors.json.push(invalidJsonFieldError);
      }
    }
    return errors;
  }

  get upstreamJson() {
    const triggeredTime =
      this.triggeredTimeValue && this.triggeredTimeValue !== ''
        ? getDateMathFormat(this.triggeredTimeUnit, this.triggeredTimeValue)
        : undefined;
    const scheduledTime =
      this.scheduledTimeValue && this.scheduledTimeValue !== ''
        ? getDateMathFormat(this.scheduledTimeUnit, this.scheduledTimeValue)
        : undefined;

    return {
      triggerData: {
        triggeredTime,
        scheduledTime,
      },
      ignoreCondition: this.ignoreCondition,
      alternativeInput:
        this.alternativeInput !== '' ? JSON.parse(this.alternativeInput) : undefined,
      actionModes: this.actionModes,
      recordExecution: this.recordExecution,
    };
  }
}
