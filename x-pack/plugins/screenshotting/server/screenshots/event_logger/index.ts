/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, LogMeta } from '@kbn/core/server';
import apm from 'elastic-apm-node';
import uuid from 'uuid';
import { CaptureResult } from '..';
import { PLUGIN_ID } from '../../../common';
import { ConfigType } from '../../config';
import { ElementPosition } from '../get_element_position_data';
import { Screenshot } from '../get_screenshots';

export enum Actions {
  SCREENSHOTTING = 'screenshot-pipeline',
  OPEN_URL = 'open-url',
  GET_ELEMENT_POSITION_DATA = 'get-element-position-data',
  GET_NUMBER_OF_ITEMS = 'get-number-of-items',
  GET_RENDER_ERRORS = 'get-render-errors',
  GET_TIMERANGE = 'get-timerange',
  INJECT_CSS = 'inject-css',
  REPOSITION = 'position-elements',
  WAIT_RENDER = 'wait-for-render',
  WAIT_VISUALIZATIONS = 'wait-for-visualizations',
  GET_SCREENSHOT = 'get-screenshots',
  PDF = 'generate-pdf',
  ADD_IMAGE = 'add-pdf-image',
  COMPILE = 'compile-pdf',
}

export type TransactionType = 'generatePdf' | 'screenshotting';
export type SpanTypes = 'setup' | 'read' | 'wait' | 'correction' | 'output';

export interface ScreenshottingAction extends LogMeta {
  event?: {
    duration?: number; // number of nanoseconds from begin to end of an event
    provider: typeof PLUGIN_ID;
  };

  message: string;
  kibana: {
    screenshotting: {
      action: Actions;
      session_id: string;

      // chromium stats
      cpu?: number;
      cpu_percentage?: number;
      memory?: number;
      memory_mb?: number;

      // screenshotting stats
      items_count?: number;
      pixels?: number;
      byte_length?: number;
      element_positions?: number;
      render_errors?: number;

      // pdf stats
      byte_length_pdf?: number;
      pdf_pages?: number;
    };
  };
}

interface ErrorAction {
  message: string;
  code?: string;
  stack_trace?: string;
  type?: string;
}

type SimpleEvent = Omit<ScreenshottingAction['kibana']['screenshotting'], 'session_id'>;

type LogAdapter = (
  message: string,
  suffix: 'start' | 'complete' | 'error',
  event: Partial<SimpleEvent>,
  startTime?: Date | undefined
) => void;

type ScreenshottingEndFn = ({ metrics, results }: CaptureResult) => void;
type GeneratePdfEndFn = (action: Partial<ScreenshottingAction['kibana']['screenshotting']>) => void;
type LogEndFn = (metricData?: Partial<ScreenshottingAction['kibana']['screenshotting']>) => void;

function fillLogData(
  message: string,
  event: Partial<SimpleEvent>,
  suffix: 'start' | 'complete' | 'error',
  sessionId: string,
  duration: number | undefined
) {
  let newMessage = message;
  if (suffix !== 'error') {
    newMessage = `${suffix === 'start' ? 'starting' : 'completed'}: ${message}`;
  }

  let interpretedAction: string;
  if (suffix === 'error') {
    interpretedAction = event.action + '-error';
  } else {
    interpretedAction = event.action + `-${suffix}`;
  }

  const logData: ScreenshottingAction = {
    message: newMessage,
    kibana: {
      screenshotting: {
        ...event,
        action: interpretedAction as Actions,
        session_id: sessionId,
      },
    },
    event: { duration, provider: PLUGIN_ID },
  };
  return logData;
}

function logAdapter(logger: Logger, sessionId: string) {
  const log: LogAdapter = (message, suffix, event, startTime) => {
    let duration: number | undefined;
    if (startTime != null) {
      const start = startTime.valueOf();
      duration = new Date(Date.now()).valueOf() - start.valueOf();
    }

    const logData = fillLogData(message, event, suffix, sessionId, duration);
    logger.debug(logData.message, logData);
  };
  return log;
}

/**
 * A class to use internal state properties to log timing between actions in the screenshotting pipeline
 */
export class EventLogger {
  private spans = new Map<Actions, apm.Span | null | undefined>();
  private transactions: Record<TransactionType, null | apm.Transaction> = {
    screenshotting: null,
    generatePdf: null,
  };

  private sessionId: string; // identifier to track all logs from one screenshotting flow
  private logEvent: LogAdapter;
  private timings: Partial<Record<Actions, Date>> = {};

  constructor(private readonly logger: Logger, private readonly config: ConfigType) {
    this.sessionId = uuid.v4();
    this.logEvent = logAdapter(logger.get('events'), this.sessionId);
  }

  private startTiming(a: Actions) {
    this.timings[a] = new Date(Date.now());
  }

  private sumScreenshotsByteLength = (byteLength: number, screenshot: Screenshot) =>
    byteLength + screenshot.data.byteLength;

  /**
   * @returns Logger - original logger
   */
  public get kbnLogger() {
    return this.logger;
  }

  /**
   * Specific method for logging the beginning of the screenshotting pipeline
   *
   * @returns {ScreenshottingEndFn}
   */
  public screenshottingTransaction(): ScreenshottingEndFn {
    this.transactions.screenshotting = apm.startTransaction(Actions.SCREENSHOTTING, PLUGIN_ID);
    this.startTiming(Actions.SCREENSHOTTING);
    this.logEvent('screenshot pipeline', 'start', { action: Actions.SCREENSHOTTING });

    return ({ metrics, results }) => {
      const cpu = metrics?.cpu;
      const memory = metrics?.memory;
      const byteLength = results.reduce(
        (totals, { screenshots }) => totals + screenshots.reduce(this.sumScreenshotsByteLength, 0),
        0
      );

      this.transactions.screenshotting?.setLabel('cpu', cpu, false);
      this.transactions.screenshotting?.setLabel('memory', memory, false);
      this.transactions.screenshotting?.setLabel('byte-length', byteLength, false);
      this.transactions.screenshotting?.end();
      this.logEvent(
        'screenshot pipeline',
        'complete',
        { action: Actions.SCREENSHOTTING, byte_length: byteLength, cpu, memory },
        this.timings[Actions.SCREENSHOTTING]
      );
    };
  }

  /**
   * Specific method for logging the beginning of the PDF generation pipeline
   *
   * @returns {GeneratePdfEndFn}
   */
  public pdfTransaction(): GeneratePdfEndFn {
    this.transactions.generatePdf = apm.startTransaction(Actions.PDF, PLUGIN_ID);
    this.startTiming(Actions.PDF);
    this.logEvent('pdf generation', 'start', { action: Actions.PDF });

    return (action) => {
      this.transactions.generatePdf?.setLabel('byte-length', action.byte_length_pdf, false);
      this.transactions.generatePdf?.setLabel('pdf-pages', action.pdf_pages, false);
      this.transactions.generatePdf?.end();
      this.logEvent(
        'pdf generation',
        'complete',
        { ...action, action: Actions.PDF },
        this.timings[Actions.PDF]
      );
    };
  }

  // General method for spans

  /**
   * General event logging function
   *
   * @param {string} message
   * @param {Actions} action - action type for kibana.screenshotting.action
   * @param {TransactionType} transaction - name of the internal APM transaction in which to associate the span
   * @param {SpanTypes} type - identifier of the span type
   * @returns {LogEndFn} - function to log the end of the span
   */
  public log(
    message: string,
    action: Actions,
    transaction: TransactionType,
    type: SpanTypes
  ): LogEndFn {
    const txn = this.transactions[transaction];
    const span = txn?.startSpan(action, type);

    this.spans.set(action, span);
    this.startTiming(action);
    this.logEvent(message, 'start', { action });

    return (metricData = {}) => {
      span?.end();
      this.logEvent(message, 'complete', { ...metricData, action }, this.timings[action]);
    };
  }

  private getPixels(elementPosition: ElementPosition, zoom: number) {
    const { width, height } = elementPosition.boundingClientRect;
    return width * zoom * (height * zoom);
  }

  /**
   * Specific method for capturing an action around screenshot capture,
   * needed to convert layout data into number of pixels for logging
   *
   * @param {GetScreenshotOptions}
   * @param {ElementPosition} .elementPosition - info for logging the screenshot dimension metrics
   * @returns {LogEndFn} - function to log the end of screenshot capture
   */
  public startScreenshot({ elementPosition }: { elementPosition: ElementPosition }): LogEndFn {
    const action = Actions.GET_SCREENSHOT;
    this.spans.set(
      action,
      this.transactions.screenshotting?.startSpan(Actions.GET_SCREENSHOT, 'read')
    );
    this.startTiming(action);
    this.logEvent('screenshot capture', 'start', {
      action: Actions.GET_SCREENSHOT,
      pixels: this.getPixels(elementPosition, this.config.capture.zoom),
    });

    return (metricData) => {
      this.spans.get(action)?.end();

      this.logEvent(
        'screenshot capture',
        'complete',
        {
          action,
          byte_length: metricData?.byte_length,
          pixels: this.getPixels(elementPosition, this.config.capture.zoom),
        },
        this.timings[action]
      );
    };
  }

  /**
   * General error logger
   *
   * @param {ErrorAction} error: The error object that was caught
   * @param {Actions} action: The screenshotting action type
   * @returns void
   */
  public error(error: ErrorAction | string, action: Actions) {
    const isError = typeof error === 'object';
    const message = `Error: ${isError ? error.message : error}`;

    const errorData = {
      ...fillLogData(
        message,
        { action },
        'error',
        this.sessionId,
        undefined //
      ),
      error: {
        message: isError ? error.message : error,
        code: isError ? error.code : undefined,
        stack_trace: isError ? error.stack_trace : undefined,
        type: isError ? error.type : undefined,
      },
    };

    this.logger.get('events').debug(message, errorData);
  }
}
