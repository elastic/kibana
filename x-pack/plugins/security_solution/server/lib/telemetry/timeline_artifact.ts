/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

class TelemetryTimelineArtifact {
  private readonly DEFAULT_ANCESTORS = 200;
  private readonly DEFAULT_DESCENDANTS = 500;
  private readonly DEFAULT_DESCENDANT_LEVELS = 20;
  private readonly DEFAULT_ALERTS_RETRIEVED_SIZE = 30;
  private readonly DEFAULT_ALERT_EQL_QUERIES = [
    'any where event.module == "endpoint" and kibana.alert.rule.immutable == true',
  ];
  private _ancestors = this.DEFAULT_ANCESTORS;
  private _descendants = this.DEFAULT_DESCENDANTS;
  private _descendant_levels = this.DEFAULT_DESCENDANT_LEVELS;
  private _alerts_retrieved_size = this.DEFAULT_ALERTS_RETRIEVED_SIZE;
  private _alert_eql_queries = this.DEFAULT_ALERT_EQL_QUERIES;

  public get ancestors(): number {
    return this._ancestors;
  }

  public set ancestors(num: number) {
    this._ancestors = num;
  }

  public get descendants(): number {
    return this._descendants;
  }

  public set descendants(num: number) {
    this._descendants = num;
  }

  public get descendant_levels(): number {
    return this._descendant_levels;
  }

  public set descendant_levels(num: number) {
    this._descendant_levels = num;
  }

  public get alerts_retrieved_size() {
    return this._alerts_retrieved_size;
  }

  public set alerts_retrieved_size(num: number) {
    this._alerts_retrieved_size = num;
  }

  public get alert_eql_queries() {
    return this._alert_eql_queries;
  }

  public set alert_eql_queries(queries: string[]) {
    this._alert_eql_queries = queries;
  }

  public resetAllToDefault() {
    this._ancestors = this.DEFAULT_ANCESTORS;
    this._descendants = this.DEFAULT_DESCENDANTS;
    this._descendant_levels = this.DEFAULT_DESCENDANT_LEVELS;
    this._alerts_retrieved_size = this.DEFAULT_ALERTS_RETRIEVED_SIZE;
    this._alert_eql_queries = this.DEFAULT_ALERT_EQL_QUERIES;
  }
}

export const telemetryTimelineArtifact = new TelemetryTimelineArtifact();
