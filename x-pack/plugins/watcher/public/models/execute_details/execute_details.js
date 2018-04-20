/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class ExecuteDetails {
  constructor(props = {}) {
    this.triggeredTime = props.triggeredTime;
    this.scheduledTime = props.scheduledTime;
    this.ignoreCondition = props.ignoreCondition;
    this.alternativeInput = props.alternativeInput;
    this.actionModes = props.actionModes;
    this.recordExecution = props.recordExecution;
  }

  get upstreamJson() {
    const triggerData = {
      triggeredTime: this.triggeredTime,
      scheduledTime: this.scheduledTime,
    };

    return {
      triggerData: triggerData,
      ignoreCondition: this.ignoreCondition,
      alternativeInput: this.alternativeInput,
      actionModes: this.actionModes,
      recordExecution: this.recordExecution
    };
  }
}
