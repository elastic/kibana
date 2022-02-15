/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { JOB_STATUSES, JobTypes } from '../../common/constants';
import type {
  BaseParamsV2,
  JobId,
  ReportApiJSON,
  ReportOutput,
  ReportSource,
  TaskRunResult,
} from '../../common/types';

const { COMPLETED, FAILED, PENDING, PROCESSING, WARNINGS } = JOB_STATUSES;

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
  public spaceId: ReportPayload['spaceId'];
  public browserTimezone?: ReportPayload['browserTimezone'];
  public layout: ReportPayload['layout'];
  public version: ReportPayload['version'];

  public jobtype: ReportSource['jobtype'];
  public created_by: ReportSource['created_by'];
  public created_at: ReportSource['created_at'];
  public started_at: ReportSource['started_at'];
  public completed_at: ReportSource['completed_at'];
  public status: JOB_STATUSES; // FIXME: can not use ReportSource['status'] due to type mismatch
  public attempts: ReportSource['attempts'];
  public max_attempts: ReportSource['max_attempts'];

  public timeout: ReportSource['timeout'];
  public kibana_name: ReportSource['kibana_name'];
  public kibana_id: ReportSource['kibana_id'];

  public size?: ReportOutput['size'];
  public content_type?: TaskRunResult['content_type'];
  public csv_contains_formulas?: TaskRunResult['csv_contains_formulas'];
  public max_size_reached?: TaskRunResult['max_size_reached'];
  public metrics?: ReportSource['metrics'];
  public warnings?: TaskRunResult['warnings'];

  public locatorParams?: BaseParamsV2['locatorParams'];

  constructor(report: ReportApiJSON) {
    this.id = report.id;
    this.index = report.index;

    this.jobtype = report.jobtype;
    this.objectType = report.payload.objectType;
    this.title = report.payload.title;
    this.layout = report.payload.layout;
    this.version = report.payload.version;
    this.created_by = report.created_by;
    this.created_at = report.created_at;
    this.started_at = report.started_at;
    this.completed_at = report.completed_at;
    this.status = report.status as JOB_STATUSES;
    this.attempts = report.attempts;
    this.max_attempts = report.max_attempts;

    this.timeout = report.timeout;
    this.kibana_name = report.kibana_name;
    this.kibana_id = report.kibana_id;
    this.browserTimezone = report.payload.browserTimezone;
    this.size = report.output?.size;
    this.content_type = report.output?.content_type;

    this.isDeprecated = report.payload.isDeprecated || false;
    this.spaceId = report.payload.spaceId;
    this.csv_contains_formulas = report.output?.csv_contains_formulas;
    this.max_size_reached = report.output?.max_size_reached;
    this.warnings = report.output?.warnings;
    this.locatorParams = (report.payload as BaseParamsV2).locatorParams;
    this.metrics = report.metrics;
  }

  getStatusMessage() {
    const status = this.status;
    let smallMessage;
    if (status === PENDING) {
      smallMessage = i18n.translate('xpack.reporting.jobStatusDetail.pendingStatusReachedText', {
        defaultMessage: 'Waiting for job to process.',
      });
    } else if (status === PROCESSING) {
      smallMessage = i18n.translate('xpack.reporting.jobStatusDetail.attemptXofY', {
        defaultMessage: 'Attempt {attempts} of {max_attempts}.',
        values: { attempts: this.attempts, max_attempts: this.max_attempts },
      });
    } else if (this.getWarnings()) {
      smallMessage = i18n.translate('xpack.reporting.jobStatusDetail.warningsText', {
        defaultMessage: 'See report info for warnings.',
      });
    } else if (this.getError()) {
      smallMessage = i18n.translate('xpack.reporting.jobStatusDetail.errorText', {
        defaultMessage: 'See report info for error details.',
      });
    }

    let deprecatedMessage: React.ReactElement | undefined;
    if (this.isDeprecated) {
      deprecatedMessage = (
        <EuiText size="s">
          {' '}
          <EuiTextColor color="warning">
            {i18n.translate('xpack.reporting.jobStatusDetail.deprecatedText', {
              defaultMessage: `This is a deprecated export type. Automation of this report will need to be re-created for compatibility with future versions of Kibana.`,
            })}
          </EuiTextColor>
        </EuiText>
      );
    }

    if (smallMessage) {
      return (
        <>
          <EuiText size="s">
            <EuiTextColor color="subdued">{smallMessage}</EuiTextColor>
          </EuiText>
          {deprecatedMessage ? deprecatedMessage : null}
        </>
      );
    }

    return null;
  }

  public get prettyStatus(): string {
    return (
      jobStatusLabelsMap.get(this.status) ??
      i18n.translate('xpack.reporting.jobStatusDetail.unknownText', { defaultMessage: 'Unknown' })
    );
  }

  public get canLinkToKibanaApp(): boolean {
    return Boolean(this.locatorParams);
  }

  public get isDownloadReady(): boolean {
    return this.status === JOB_STATUSES.COMPLETED || this.status === JOB_STATUSES.WARNINGS;
  }

  public get prettyJobTypeName(): undefined | string {
    switch (this.jobtype as JobTypes) {
      case 'printable_pdf':
      case 'printable_pdf_v2':
        return i18n.translate('xpack.reporting.jobType.pdfOutputName', {
          defaultMessage: 'PDF',
        });
      case 'PNG':
      case 'PNGV2':
        return i18n.translate('xpack.reporting.jobType.pngOutputName', {
          defaultMessage: 'PNG',
        });
      case 'csv_searchsource':
        return i18n.translate('xpack.reporting.jobType.csvOutputName', {
          defaultMessage: 'CSV',
        });
      default:
        return undefined;
    }
  }

  public get prettyTimeout(): string {
    if (this.timeout == null) {
      return i18n.translate('xpack.reporting.jobStatusDetail.timeoutSecondsUnknown', {
        defaultMessage: 'Unknown',
      });
    }
    const seconds = this.timeout / 1000;
    return i18n.translate('xpack.reporting.jobStatusDetail.timeoutSeconds', {
      defaultMessage: '{timeout} seconds',
      values: { timeout: seconds },
    });
  }

  /**
   * Returns a user friendly version of the report job creation date
   */
  getCreatedAtDate(): string {
    return this.formatDate(this.created_at);
  }

  /**
   * Returns a user friendly version of the user that created the report job
   */
  getCreatedBy(): string {
    return (
      this.created_by ||
      i18n.translate('xpack.reporting.jobCreatedBy.unknownUserPlaceholderText', {
        defaultMessage: 'Unknown',
      })
    );
  }

  getCreatedAtLabel() {
    if (this.created_by) {
      return (
        <>
          <div>{this.formatDate(this.created_at)}</div>
          <span>{this.created_by}</span>
        </>
      );
    }
    return this.formatDate(this.created_at);
  }

  /*
   * We use `output.warnings` to show the error of a failed report job,
   * and to show warnings of a job that completed with warnings.
   */

  // There is no error unless the status is 'failed'
  getError() {
    if (this.status === FAILED) {
      return this.warnings;
    }
  }

  getDeprecatedMessage(): undefined | string {
    if (this.isDeprecated) {
      return i18n.translate('xpack.reporting.jobWarning.exportTypeDeprecated', {
        defaultMessage:
          'This is a deprecated export type. Automation of this report will need to be re-created for compatibility with future versions of Kibana.',
      });
    }
  }

  getWarnings() {
    const warnings: string[] = [];
    const deprecatedMessage = this.getDeprecatedMessage();
    if (deprecatedMessage) {
      warnings.push(deprecatedMessage);
    }

    if (this.csv_contains_formulas) {
      warnings.push(
        i18n.translate('xpack.reporting.jobWarning.csvContainsFormulas', {
          defaultMessage:
            'Your CSV contains characters that spreadsheet applications might interpret as formulas.',
        })
      );
    }
    if (this.max_size_reached) {
      warnings.push(
        i18n.translate('xpack.reporting.jobWarning.maxSizeReachedTooltip', {
          defaultMessage: 'Your search reached the max size and contains partial data.',
        })
      );
    }

    // warnings could contain the failure message
    if (this.status !== FAILED && this.warnings?.length) {
      warnings.push(...this.warnings);
    }

    if (warnings.length) {
      return (
        <ul>
          {warnings.map((w, i) => {
            return <li key={`warning-key-${i}`}>{w}</li>;
          })}
        </ul>
      );
    }
  }

  getPrettyStatusTimestamp() {
    return this.formatDate(this.getStatusTimestamp());
  }

  private formatDate(timestamp: string) {
    try {
      return moment(timestamp).format('YYYY-MM-DD @ hh:mm A');
    } catch (error) {
      // ignore parse error and display unformatted value
      return timestamp;
    }
  }

  private getStatusTimestamp() {
    const status = this.status;
    if (status === PROCESSING && this.started_at) {
      return this.started_at;
    }

    if (this.completed_at && ([COMPLETED, FAILED, WARNINGS] as string[]).includes(status)) {
      return this.completed_at;
    }

    return this.created_at;
  }
}

const jobStatusLabelsMap = new Map<JOB_STATUSES, string>([
  [
    PENDING,
    i18n.translate('xpack.reporting.jobStatuses.pendingText', {
      defaultMessage: 'Pending',
    }),
  ],
  [
    PROCESSING,
    i18n.translate('xpack.reporting.jobStatuses.processingText', {
      defaultMessage: 'Processing',
    }),
  ],
  [
    COMPLETED,
    i18n.translate('xpack.reporting.jobStatuses.completedText', {
      defaultMessage: 'Completed', // NOTE: a job is `completed` not `completed_with_warings` if it has reached max size or possibly contains csv characters
    }),
  ],
  [
    WARNINGS,
    i18n.translate('xpack.reporting.jobStatuses.warningText', {
      defaultMessage: 'Completed',
    }),
  ],
  [
    FAILED,
    i18n.translate('xpack.reporting.jobStatuses.failedText', {
      defaultMessage: 'Failed',
    }),
  ],
]);
