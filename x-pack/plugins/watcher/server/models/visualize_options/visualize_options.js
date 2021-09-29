/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class VisualizeOptions {
  constructor(props) {
    this.rangeFrom = props.rangeFrom;
    this.rangeTo = props.rangeTo;
    this.interval = props.interval; // Only used in 7.x, will be undefined in 8.x
    this.fixed_interval = props.fixed_interval; // Used from 8.x
    this.timezone = props.timezone;
  }

  // generate ExecuteDetails object from kibana response
  static fromDownstreamJson(downstreamJson) {
    return new VisualizeOptions(downstreamJson);
  }
}
