/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { Logger, LogMeta } from '@kbn/core/server';
import { CaptureResult } from '..';
import { PLUGIN_ID } from '../../../common';
import { Screenshot } from '../get_screenshots';

export enum Actions {
  SCREENSHOTTING = 'screenshot-pipeline',
  PDF = 'generate-pdf',
  CREATE_LAYOUT = 'create-layout',
  CREATE_PAGE = 'create-page',
  GET_ELEMENT_POSITION_DATA = 'get-element-position-data',
  GET_NUMBER_OF_ITEMS = 'get-number-of-items',
  GET_RENDER_ERRORS = 'get-render-errors',
  GET_SCREENSHOTS = 'get-screenshots',
  GET_TIMERANGE = 'get-timerange',
  INJECT_CSS = 'inject-css',
  OPEN_URL = 'open-url',
  REPOSITION = 'position-elements',
  WAIT_RENDER = 'wait-for-render',
  WAIT_VISUALIZATIONS = 'wait-for-visualizations',
  ADD_IMAGE = 'add-pdf-image',
  COMPILE = 'compile-pdf',
}

enum SpanTypes {
  SETUP = 'setup',
  READ = 'read',
  WAIT = 'wait',
  CORRECT = 'correction',
  OUTPUT = 'output',
}

export interface ScreenshottingAction extends LogMeta {
  event?: {
    duration?: number; // number of nanoseconds from begin to end of an event
  };

  message: string;
  kibana: {
    screenshotting: {
      action: Actions;
      // flow_id: string; // TODO random uuid to trace a pipeline flow
      // is_pdf: boolean; // TODO
      cpu?: number;
      cpu_percentage?: number;
      memory?: number;
      memory_mb?: number;
      items_count?: number;
      byte_length?: number;
      byte_length_pdf?: number;
      pdf_pages?: number;
      render_errors?: number;
    };
  };
}

interface ErrorAction {
  message: string;
  code?: string;
  stack_trace?: string;
  type?: string;
}

interface PdfEndOptions {
  byteLengthPdf: number;
  pdfPages: number;
}

interface RenderErrorsOptions {
  renderErrors: number;
}

interface NumberOfItemsOptions {
  itemsCount: number;
}

type SpanEntity =
  | 'addPdfImage'
  | 'compilePdf'
  | 'createLayout'
  | 'createPage'
  | 'getElementPositionData'
  | 'getNumberOfItems'
  | 'getRenderErrors'
  | 'getScreenshots'
  | 'getTimeRange'
  | 'injectCss'
  | 'openUrl'
  | 'positionElements'
  | 'waitForRender'
  | 'waitForVisualization';

type TransactionEntity = 'generatePdf' | 'screenshotting';

type LogAdapter = (
  message: string,
  event: ScreenshottingAction['kibana']['screenshotting'],
  startTime?: Date | undefined
) => void;

function logAdapter(logger: Logger) {
  const log: LogAdapter = (
    message: string,
    event: ScreenshottingAction['kibana']['screenshotting'],
    startTime?: Date | undefined
  ) => {
    let duration: number | undefined;
    if (startTime != null) {
      const start = startTime.valueOf();
      duration = new Date(Date.now()).valueOf() - start.valueOf();
    }

    logger.debug(message, {
      message,
      kibana: { screenshotting: event },
      event: { duration, provider: PLUGIN_ID },
    });
  };
  return log;
}

/**
 * A class to use internal state properties to log timing between actions in the screenshotting pipeline
 */
export class EventLogger {
  private spans: Record<SpanEntity, null | apm.Span | undefined> = {
    addPdfImage: null,
    compilePdf: null,
    createLayout: null,
    createPage: null,
    getElementPositionData: null,
    getNumberOfItems: null,
    getRenderErrors: null,
    getScreenshots: null,
    getTimeRange: null,
    injectCss: null,
    openUrl: null,
    positionElements: null,
    waitForRender: null,
    waitForVisualization: null,
  };

  private transactions: Record<TransactionEntity, null | apm.Transaction> = {
    screenshotting: null,
    generatePdf: null,
  };

  private logEventData: ReturnType<typeof logAdapter>;
  private timings: Partial<Record<Actions, Date>> = {};

  constructor(private readonly logger: Logger) {
    this.logEventData = logAdapter(logger.get('events'));
    // TODO flow_id
  }

  private startTiming(a: Actions) {
    this.timings[a] = new Date(Date.now());
  }

  private sumScreenshotsByteLength = (byteLength: number, screenshot: Screenshot) =>
    byteLength + screenshot.data.byteLength;

  /**
   * Helper to return the original logger
   *
   * @returns Logger
   */
  public get kbnLogger() {
    return this.logger;
  }

  // Methods for transactions

  /**
   * Signal when the screenshotting pipeline begins
   *
   * @returns void
   */
  public screenshottingBegin() {
    this.transactions.screenshotting = apm.startTransaction(Actions.SCREENSHOTTING, PLUGIN_ID);
    this.logEventData(
      'screenshot-pipeline starting',
      { action: Actions.SCREENSHOTTING } //
    );
    this.startTiming(Actions.SCREENSHOTTING);
  }

  /**
   * Signal when the screenshotting pipeline finishes
   *
   * @param {CaptureResult} [TODO:name] - [TODO:description]
   * @returns void
   */
  public screenshottingEnd({ metrics, results }: CaptureResult) {
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

    this.logEventData(
      'screenshot-pipeline finished',
      { action: Actions.SCREENSHOTTING, byte_length: byteLength, cpu, memory },
      this.timings[Actions.SCREENSHOTTING]
    );
  }

  /**
   * Signal when PdfMaker generation starts
   *
   * @returns void
   */
  public pdfBegin() {
    this.transactions.generatePdf = apm.startTransaction(Actions.PDF, PLUGIN_ID);
    this.logEventData(
      'pdf generation starting',
      { action: Actions.PDF } //
    );
    this.startTiming(Actions.PDF);
  }

  /**
   * Signal when PdfMaker generation finishes
   *
   * @returns void
   */
  public pdfEnd({ byteLengthPdf, pdfPages }: PdfEndOptions) {
    this.transactions.generatePdf?.setLabel('byte-length', byteLengthPdf, false);
    this.transactions.generatePdf?.setLabel('pdf-pages', pdfPages, false);
    this.transactions.generatePdf?.end();

    this.logEventData(
      'pdf generation finished',
      {
        action: Actions.PDF,
        byte_length_pdf: byteLengthPdf,
        pdf_pages: pdfPages,
      },
      this.timings[Actions.PDF]
    );
  }

  // Methods for spans

  public createLayoutBegin() {
    this.spans.createLayout = this.transactions.screenshotting?.startSpan(
      Actions.CREATE_LAYOUT,
      SpanTypes.SETUP
    );
    this.logEventData(
      'create-layout starting',
      { action: Actions.CREATE_LAYOUT } //
    );
    this.startTiming(Actions.CREATE_LAYOUT);
  }

  public createLayoutEnd() {
    this.spans.createLayout?.end();
    this.logEventData(
      'create-layout finished',
      { action: Actions.CREATE_LAYOUT },
      this.timings[Actions.CREATE_LAYOUT]
    );
  }

  public getElementPositionDataBegin() {
    this.spans.getElementPositionData = this.transactions.screenshotting?.startSpan(
      Actions.GET_ELEMENT_POSITION_DATA,
      SpanTypes.READ
    );
    this.logEventData(
      'getting element position data',
      { action: Actions.GET_ELEMENT_POSITION_DATA } //
    );
    this.startTiming(Actions.GET_ELEMENT_POSITION_DATA);
  }

  public getElementPositionDataEnd() {
    this.spans.getElementPositionData?.end();
    this.logEventData(
      'element position data read',
      { action: Actions.GET_ELEMENT_POSITION_DATA },
      this.timings[Actions.GET_ELEMENT_POSITION_DATA]
    );
  }

  public getNumberOfItemsBegin() {
    this.spans.getNumberOfItems = this.transactions.screenshotting?.startSpan(
      Actions.GET_NUMBER_OF_ITEMS,
      SpanTypes.READ
    );
    this.logEventData(
      'getting number of visualization items',
      { action: Actions.GET_NUMBER_OF_ITEMS } //
    );
    this.startTiming(Actions.GET_NUMBER_OF_ITEMS);
  }

  public getNumberOfItemsEnd({ itemsCount }: NumberOfItemsOptions) {
    this.spans.getNumberOfItems?.end();
    this.logEventData(
      'received number of visualization items',
      {
        action: Actions.GET_NUMBER_OF_ITEMS,
        items_count: itemsCount,
      },
      this.timings[Actions.GET_NUMBER_OF_ITEMS]
    );
  }

  public getRenderErrorsBegin() {
    this.spans.getRenderErrors = this.transactions.screenshotting?.startSpan(
      Actions.GET_RENDER_ERRORS,
      SpanTypes.READ
    );
    this.logEventData(
      'starting scan for rendering errors',
      { action: Actions.GET_RENDER_ERRORS } //
    );
    this.startTiming(Actions.GET_RENDER_ERRORS);
  }

  public getRenderErrorsEnd({ renderErrors }: RenderErrorsOptions) {
    this.spans.getRenderErrors?.end();
    this.logEventData(
      'finished scanning for rendering errors',
      {
        action: Actions.GET_RENDER_ERRORS,
        render_errors: renderErrors,
      },
      this.timings[Actions.GET_RENDER_ERRORS]
    );
  }

  public getScreenshotsBegin() {
    this.spans.getScreenshots = this.transactions.screenshotting?.startSpan(
      Actions.GET_SCREENSHOTS,
      SpanTypes.READ
    );
    this.logEventData(
      'capturing screenshots',
      { action: Actions.GET_SCREENSHOTS } //
    );
    this.startTiming(Actions.GET_SCREENSHOTS);
  }

  public getScreenshotsEnd() {
    this.spans.getScreenshots?.end();
    this.logEventData(
      'screenshots captured',
      { action: Actions.GET_SCREENSHOTS },
      this.timings[Actions.GET_SCREENSHOTS]
    );
  }

  public getTimeRangeBegin() {
    this.spans.getTimeRange = this.transactions.screenshotting?.startSpan(
      Actions.GET_TIMERANGE,
      SpanTypes.READ
    );
    this.logEventData(
      'getting time range',
      { action: Actions.GET_TIMERANGE } //
    );
    this.startTiming(Actions.GET_TIMERANGE);
  }

  public getTimeRangeEnd() {
    this.spans.getTimeRange?.end();
    this.logEventData(
      'received time range',
      { action: Actions.GET_TIMERANGE },
      this.timings[Actions.GET_TIMERANGE]
    );
  }

  public injectCssBegin() {
    this.spans.injectCss = this.transactions.screenshotting?.startSpan(
      Actions.INJECT_CSS,
      SpanTypes.CORRECT
    );
    this.logEventData(
      'injecting css',
      { action: Actions.INJECT_CSS } //
    );
    this.startTiming(Actions.INJECT_CSS);
  }

  public injectCssEnd() {
    this.spans.injectCss?.end();
    this.logEventData(
      'finished injecting css',
      { action: Actions.INJECT_CSS },
      this.timings[Actions.INJECT_CSS]
    );
  }

  public openUrlBegin() {
    this.spans.openUrl = this.transactions.screenshotting?.startSpan(
      Actions.OPEN_URL,
      SpanTypes.WAIT
    );
    this.logEventData(
      'opening url',
      { action: Actions.OPEN_URL } //
    );
    this.startTiming(Actions.OPEN_URL);
  }

  public openUrlEnd() {
    this.spans.openUrl?.end();
    this.logEventData(
      'finished opening url',
      { action: Actions.OPEN_URL },
      this.timings[Actions.OPEN_URL]
    );
  }

  public positionElementsBegin() {
    this.spans.positionElements = this.transactions.screenshotting?.startSpan(
      Actions.REPOSITION,
      SpanTypes.CORRECT
    );
    this.logEventData(
      'positioning elements',
      { action: Actions.REPOSITION } //
    );
    this.startTiming(Actions.REPOSITION);
  }

  public positionElementsEnd() {
    this.spans.positionElements?.end();
    this.logEventData(
      'finished positioning elements',
      { action: Actions.REPOSITION },
      this.timings[Actions.REPOSITION]
    );
  }

  public waitForRenderBegin() {
    this.spans.waitForRender = this.transactions.screenshotting?.startSpan(
      Actions.WAIT_RENDER,
      SpanTypes.WAIT
    );
    this.logEventData(
      'waiting for render to complete',
      { action: Actions.WAIT_RENDER } //
    );
    this.startTiming(Actions.WAIT_RENDER);
  }

  public waitForRenderEnd() {
    this.spans.waitForRender?.end();
    this.logEventData(
      'finished waiting for render to complete',
      { action: Actions.WAIT_RENDER },
      this.timings[Actions.WAIT_RENDER]
    );
  }

  public waitForVisualizationBegin() {
    this.spans.waitForVisualization = this.transactions.screenshotting?.startSpan(
      Actions.WAIT_VISUALIZATIONS,
      SpanTypes.WAIT
    );
    this.logEventData(
      'waiting for visualizations',
      { action: Actions.WAIT_VISUALIZATIONS } //
    );
    this.startTiming(Actions.WAIT_VISUALIZATIONS);
  }

  public waitForVisualizationEnd() {
    this.spans.waitForVisualization?.end();
    this.logEventData(
      'finished waiting for visualizations',
      { action: Actions.WAIT_VISUALIZATIONS },
      this.timings[Actions.WAIT_VISUALIZATIONS]
    );
  }

  public addPdfImageBegin() {
    this.spans.addPdfImage = this.transactions.generatePdf?.startSpan(
      Actions.ADD_IMAGE,
      SpanTypes.OUTPUT
    );
    this.logEventData(
      'adding pdf image',
      { action: Actions.ADD_IMAGE } //
    );
    this.startTiming(Actions.ADD_IMAGE);
  }

  public addPdfImageEnd() {
    this.spans.addPdfImage?.end();
    this.logEventData(
      'pdf image added',
      { action: Actions.ADD_IMAGE },
      this.timings[Actions.ADD_IMAGE]
    );
  }

  public compilePdfBegin() {
    this.spans.compilePdf = this.transactions.generatePdf?.startSpan(
      Actions.COMPILE,
      SpanTypes.OUTPUT
    );
    this.logEventData(
      'compiling pdf file',
      { action: Actions.COMPILE } //
    );
    this.startTiming(Actions.COMPILE);
  }

  public compilePdfEnd() {
    this.spans.compilePdf?.end();
    this.logEventData(
      'pdf file compiled',
      { action: Actions.COMPILE },
      this.timings[Actions.COMPILE]
    );
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
    this.logger.error(error as Error);
    this.logger.debug('an error occurred', {
      message: 'an error occurred',
      kibana: { screenshotting: { action } },
      event: { provider: PLUGIN_ID },
      error: {
        message: isError ? error.message : undefined,
        code: isError ? error.code : undefined,
        stack_trace: isError ? error.stack_trace : undefined,
        type: isError ? error.type : undefined,
      },
    });
  }
}
