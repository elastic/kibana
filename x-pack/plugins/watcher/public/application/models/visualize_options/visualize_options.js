/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class VisualizeOptions {
  constructor(props = {}, kibanaVersion) {
    this.rangeFrom = props.rangeFrom;
    this.rangeTo = props.rangeTo;
    this.interval = props.interval;
    this.timezone = props.timezone;
    this.kibanaVersion = kibanaVersion;
  }

  get upstreamJson() {
    const json = {
      rangeFrom: this.rangeFrom,
      rangeTo: this.rangeTo,
      timezone: this.timezone,
    };

    if (this.kibanaVersion < 8) {
      // In 7.x we still use the deprecated "interval" option
      json.interval = this.interval;
    } else {
      // From 8.x we use the more precise "fixed_interval"
      json.fixed_interval = this.interval;
    }

    return json;
  }
}
