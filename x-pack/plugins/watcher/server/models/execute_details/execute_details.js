/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit, isUndefined } from 'lodash';

export class ExecuteDetails {
  constructor(props) {
    this.triggerData = props.triggerData;
    this.ignoreCondition = props.ignoreCondition;
    this.alternativeInput = props.alternativeInput;
    this.actionModes = props.actionModes;
    this.recordExecution = props.recordExecution;
  }

  get upstreamJson() {
    const triggerData = {
      triggered_time: this.triggerData.triggeredTime,
      scheduled_time: this.triggerData.scheduledTime,
    };

    const result = {
      trigger_data: omit(triggerData, isUndefined),
      ignore_condition: this.ignoreCondition,
      alternative_input: this.alternativeInput,
      action_modes: this.actionModes,
      record_execution: this.recordExecution,
    };

    return omit(result, isUndefined);
  }

  // generate ExecuteDetails object from kibana response
  static fromDownstreamJson(downstreamJson) {
    return new ExecuteDetails(downstreamJson);
  }
}
