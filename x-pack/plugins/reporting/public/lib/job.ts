/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobId, ReportApiJSON, ReportSource, TaskRunResult } from '../../common/types';

type ReportPayload = ReportSource['payload'];

/*
 * This class represents a report job for the UI
 * It can be instantiated with ReportApiJSON: the response data format for the report job APIs
 */
export class Job {
  public id: JobId;
  public index: string;

  public objectType: ReportPayload['objectType'];
  public title: ReportPayload['title'];
  public isDeprecated: ReportPayload['isDeprecated'];
  public browserTimezone?: ReportPayload['browserTimezone'];
  public layout: ReportPayload['layout'];

  public jobtype: ReportSource['jobtype'];
  public created_by: ReportSource['created_by'];
  public created_at: ReportSource['created_at'];
  public started_at: ReportSource['started_at'];
  public completed_at: ReportSource['completed_at'];
  public status: ReportSource['status'];
  public attempts: ReportSource['attempts'];
  public max_attempts: ReportSource['max_attempts'];

  public timeout: ReportSource['timeout'];
  public kibana_name: ReportSource['kibana_name'];
  public kibana_id: ReportSource['kibana_id'];
  public browser_type: ReportSource['browser_type'];

  public size?: TaskRunResult['size'];
  public content_type?: TaskRunResult['content_type'];
  public csv_contains_formulas?: TaskRunResult['csv_contains_formulas'];
  public max_size_reached?: TaskRunResult['max_size_reached'];
  public warnings?: TaskRunResult['warnings'];

  constructor(report: ReportApiJSON) {
    this.id = report.id;
    this.index = report.index;

    this.jobtype = report.jobtype;
    this.objectType = report.payload.objectType;
    this.title = report.payload.title;
    this.layout = report.payload.layout;
    this.created_by = report.created_by;
    this.created_at = report.created_at;
    this.started_at = report.started_at;
    this.completed_at = report.completed_at;
    this.status = report.status;
    this.attempts = report.attempts;
    this.max_attempts = report.max_attempts;

    this.timeout = report.timeout;
    this.kibana_name = report.kibana_name;
    this.kibana_id = report.kibana_id;
    this.browser_type = report.browser_type;
    this.browserTimezone = report.payload.browserTimezone;
    this.size = report.output?.size;
    this.content_type = report.output?.content_type;

    this.isDeprecated = report.payload.isDeprecated || false;
    this.csv_contains_formulas = report.output?.csv_contains_formulas;
    this.max_size_reached = report.output?.max_size_reached;
    this.warnings = report.output?.warnings;
  }
}
