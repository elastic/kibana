/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// FIXME: Once/if we have the ability to get page count directly from Chrome/puppeteer
// we should get rid of this lib.
import * as PDFJS from 'pdfjs-dist/legacy/build/pdf.js';

import type { PackageInfo } from '@kbn/core/server';
import { groupBy } from 'lodash';
import type { LayoutParams, LayoutType } from '../../../common';
import type { Layout } from '../../layouts';
import type { CaptureMetrics, CaptureOptions, CaptureResult } from '../../screenshots';
import { EventLogger, Transactions } from '../../screenshots/event_logger';
import { pngsToPdf } from './pdf_maker';

/**
 * PDFs can be a single, long page or they can be multiple pages. For example:
 *
 * => When creating a PDF intended for print multiple PNGs will be spread out across pages
 * => When creating a PDF from a Canvas workpad, each page in the workpad will be placed on a separate page
 */
export type PdfLayoutParams = LayoutParams<LayoutType>;

/**
 * Options that should be provided to a PDF screenshot request.
 */
export interface PdfScreenshotOptions extends CaptureOptions {
  /**
   * Whether to format the output as a PDF.
   */
  format: 'pdf';

  /**
   * Document title.
   */
  title?: string;

  /**
   * Logo at the footer.
   */
  logo?: string;

  /**
   * We default to the "print" layout if no ID is specified for the layout
   */
  layout?: PdfLayoutParams;
}

export interface PdfScreenshotMetrics extends Partial<CaptureMetrics> {
  /**
   * A number of emitted pages in the generated PDF report.
   */
  pages: number;
}

/**
 * Final, formatted PDF result
 */
export interface PdfScreenshotResult {
  /**
   * Collected performance metrics during the screenshotting session along with the PDF generation ones.
   */
  metrics: PdfScreenshotMetrics;

  /**
   * PDF document data buffer.
   */
  data: Buffer;

  /**
   * Any errors that were encountered while create the PDF and navigating between pages
   */
  errors: Error[];

  /**
   * Any render errors that could mean some visualizations are missing from the end result.
   */
  renderErrors: string[];
}

function getTimeRange(results: CaptureResult['results']) {
  const grouped = groupBy(results.map(({ timeRange }) => timeRange));
  const values = Object.values(grouped);
  if (values.length !== 1) {
    return;
  }

  return values[0][0];
}

export async function toPdf(
  eventLogger: EventLogger,
  packageInfo: PackageInfo,
  layout: Layout,
  { logo, title }: PdfScreenshotOptions,
  { metrics, results }: CaptureResult
): Promise<PdfScreenshotResult> {
  let buffer: Buffer;
  let pages: number;
  const shouldConvertPngsToPdf = layout.id !== 'print';
  if (shouldConvertPngsToPdf) {
    const timeRange = getTimeRange(results);
    try {
      ({ buffer, pages } = await pngsToPdf({
        title: title ? `${title}${timeRange ? ` - ${timeRange}` : ''}` : undefined,
        results,
        layout,
        logo,
        packageInfo,
        eventLogger,
      }));

      return {
        metrics: {
          ...(metrics ?? {}),
          pages,
        },
        data: buffer,
        errors: results.flatMap(({ error }) => (error ? [error] : [])),
        renderErrors: results.flatMap(({ renderErrors }) => renderErrors ?? []),
      };
    } catch (error) {
      eventLogger.kbnLogger.error(`Could not generate the PDF buffer!`);
      eventLogger.error(error, Transactions.PDF);
      throw error;
    }
  } else {
    buffer = results[0].screenshots[0].data; // This buffer is already the PDF
    pages = await PDFJS.getDocument({ data: buffer }).promise.then((doc) => {
      const numPages = doc.numPages;
      doc.destroy();
      return numPages;
    });
  }

  return {
    metrics: {
      ...(metrics ?? {}),
      pages,
    },
    data: buffer,
    errors: results.flatMap(({ error }) => (error ? [error] : [])),
    renderErrors: results.flatMap(({ renderErrors }) => renderErrors ?? []),
  };
}
